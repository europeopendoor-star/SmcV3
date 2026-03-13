from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import MetaTrader5 as mt5
from datetime import datetime, timezone
import pandas as pd
import uvicorn
import math

app = FastAPI(title="Local MT5 Microservice")

# Mapping our Node.js timeframes to MT5 timeframe constants
TIMEFRAME_MAP = {
    '1m': mt5.TIMEFRAME_M1,
    '5m': mt5.TIMEFRAME_M5,
    '1h': mt5.TIMEFRAME_H1,
    '4h': mt5.TIMEFRAME_H4,
    '1d': mt5.TIMEFRAME_D1
}

@app.on_event("startup")
async def startup_event():
    # Initialize connection to the MT5 terminal
    # User confirmed they will have MT5 open and logged in
    if not mt5.initialize():
        print(f"initialize() failed, error code = {mt5.last_error()}")
        # We don't necessarily raise an exception here because the user
        # might start the server before MT5 is fully open, but it's a warning.
    else:
        print("Connected to MetaTrader 5 successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    mt5.shutdown()

@app.get("/")
def read_root():
    return {"status": "MT5 Local API is running"}

@app.get("/history")
def get_history(symbol: str, period: str, limit: int = 500):
    """
    Fetch historical OHLCV data for a given symbol and period.
    """
    if not mt5.initialize():
        raise HTTPException(status_code=500, detail="Failed to initialize MT5")

    if period not in TIMEFRAME_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid period. Must be one of {list(TIMEFRAME_MAP.keys())}")

    mt5_timeframe = TIMEFRAME_MAP[period]

    # Check if symbol is available
    if not mt5.symbol_info(symbol):
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found in MT5")

    # Get rates from MT5
    # fetch `limit` bars ending at the current time
    rates = mt5.copy_rates_from_pos(symbol, mt5_timeframe, 0, limit)

    if rates is None or len(rates) == 0:
        raise HTTPException(status_code=404, detail=f"No data returned for {symbol}")

    # Convert to standard format
    # rates format: (time, open, high, low, close, tick_volume, spread, real_volume)
    response_data = []
    for r in rates:
        response_data.append({
            "t": int(r['time']), # Unix timestamp in seconds
            "o": float(r['open']),
            "h": float(r['high']),
            "l": float(r['low']),
            "c": float(r['close']),
            "v": float(r['tick_volume']) # Using tick_volume for standard Forex volume
        })

    return {
        "status": True,
        "response": response_data
    }

class TradeRequest(BaseModel):
    symbol: str
    action: str # "buy" or "sell"
    volume: float
    sl: float = 0.0
    tp: float = 0.0
    magic: int = 234000

@app.post("/trade")
def execute_trade(request: TradeRequest):
    """
    Execute a market order (Buy/Sell) with optional SL/TP
    """
    if not mt5.initialize():
        raise HTTPException(status_code=500, detail="Failed to initialize MT5")

    symbol = request.symbol
    action = request.action.lower()
    volume = float(request.volume)

    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")

    if not symbol_info.visible:
        if not mt5.symbol_select(symbol, True):
            raise HTTPException(status_code=500, detail=f"Failed to select symbol {symbol}")

    # Determine the order type and price
    if action == "buy":
        order_type = mt5.ORDER_TYPE_BUY
        price = mt5.symbol_info_tick(symbol).ask
    elif action == "sell":
        order_type = mt5.ORDER_TYPE_SELL
        price = mt5.symbol_info_tick(symbol).bid
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'buy' or 'sell'.")

    # Prepare the MT5 order request
    mt5_request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": volume,
        "type": order_type,
        "price": price,
        "deviation": 20, # 20 points slippage
        "magic": request.magic,
        "comment": "NodeJS Auto Trade",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC, # Immediate or Cancel is standard for forex
    }

    if request.sl > 0:
        mt5_request["sl"] = float(request.sl)
    if request.tp > 0:
        mt5_request["tp"] = float(request.tp)

    # Send order to MT5
    result = mt5.order_send(mt5_request)

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        raise HTTPException(status_code=500, detail=f"Trade failed. Error code: {result.retcode}. Comment: {result.comment}")

    return {
        "status": "success",
        "order_id": result.order,
        "price": result.price,
        "volume": result.volume
    }

class CloseTradeRequest(BaseModel):
    ticket: int

@app.post("/trade/close")
def close_trade(request: CloseTradeRequest):
    """
    Close an open position by ticket number
    """
    if not mt5.initialize():
        raise HTTPException(status_code=500, detail="Failed to initialize MT5")

    position = mt5.positions_get(ticket=request.ticket)
    if position is None or len(position) == 0:
        raise HTTPException(status_code=404, detail=f"Position {request.ticket} not found")

    pos = position[0]

    # To close a Buy, we Sell at Bid. To close a Sell, we Buy at Ask.
    symbol = pos.symbol
    if pos.type == mt5.ORDER_TYPE_BUY:
        close_type = mt5.ORDER_TYPE_SELL
        price = mt5.symbol_info_tick(symbol).bid
    else:
        close_type = mt5.ORDER_TYPE_BUY
        price = mt5.symbol_info_tick(symbol).ask

    close_request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": pos.volume,
        "type": close_type,
        "position": pos.ticket,
        "price": price,
        "deviation": 20,
        "magic": pos.magic,
        "comment": "NodeJS Close Trade",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(close_request)

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        raise HTTPException(status_code=500, detail=f"Close failed. Error code: {result.retcode}. Comment: {result.comment}")

    return {
        "status": "success",
        "closed_ticket": request.ticket,
        "price": result.price
    }

@app.get("/positions")
def get_positions(symbol: str = None):
    """
    Get all active positions, optionally filtered by symbol
    """
    if not mt5.initialize():
        raise HTTPException(status_code=500, detail="Failed to initialize MT5")

    if symbol:
        positions = mt5.positions_get(symbol=symbol)
    else:
        positions = mt5.positions_get()

    if positions is None:
        return {"status": "success", "positions": []}

    result = []
    for p in positions:
        result.append({
            "ticket": p.ticket,
            "symbol": p.symbol,
            "type": "buy" if p.type == mt5.ORDER_TYPE_BUY else "sell",
            "volume": p.volume,
            "price_open": p.price_open,
            "sl": p.sl,
            "tp": p.tp,
            "price_current": p.price_current,
            "profit": p.profit,
            "time": p.time
        })

    return {"status": "success", "positions": result}

if __name__ == "__main__":
    uvicorn.run("mt5_server:app", host="127.0.0.1", port=8000, reload=True)
