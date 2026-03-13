import re

with open("server/python/mt5_server.py", "r") as f:
    content = f.read()

new_imports = """from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import MetaTrader5 as mt5
from datetime import datetime, timezone
import pandas as pd
import uvicorn
import math
from typing import Optional
"""

content = content.replace("""from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import MetaTrader5 as mt5
from datetime import datetime, timezone
import pandas as pd
import uvicorn
import math""", new_imports)

new_routes = """
@app.get("/account")
def get_account_info():
    \"\"\"
    Get MT5 account information (balance, equity, margin, etc.)
    \"\"\"
    if not mt5.initialize():
        raise HTTPException(status_code=500, detail="Failed to initialize MT5")

    account_info = mt5.account_info()
    if account_info is None:
        raise HTTPException(status_code=500, detail="Failed to retrieve account info")

    return {
        "status": "success",
        "account": {
            "login": account_info.login,
            "currency": account_info.currency,
            "balance": account_info.balance,
            "equity": account_info.equity,
            "margin": account_info.margin,
            "margin_free": account_info.margin_free,
            "margin_level": account_info.margin_level,
            "leverage": account_info.leverage
        }
    }

@app.get("/symbol/{symbol}")
def get_symbol_info(symbol: str):
    \"\"\"
    Get MT5 symbol specifications (contract size, digits, pip value, spread)
    \"\"\"
    if not mt5.initialize():
        raise HTTPException(status_code=500, detail="Failed to initialize MT5")

    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")

    return {
        "status": "success",
        "symbol": {
            "name": symbol_info.name,
            "digits": symbol_info.digits,
            "spread": symbol_info.spread,
            "contract_size": symbol_info.trade_contract_size,
            "tick_value": symbol_info.trade_tick_value,
            "tick_size": symbol_info.trade_tick_size,
            "point": symbol_info.point,
            "trade_calc_mode": symbol_info.trade_calc_mode
        }
    }

class PendingTradeRequest(BaseModel):
    symbol: str
    action: str # "buy_limit", "sell_limit", "buy_stop", "sell_stop"
    volume: float
    price: float
    sl: float = 0.0
    tp: float = 0.0
    magic: int = 234000
    expiration: Optional[int] = 0

@app.post("/trade/pending")
def execute_pending_trade(request: PendingTradeRequest):
    \"\"\"
    Execute a pending order (Buy Limit, Sell Limit, Buy Stop, Sell Stop)
    \"\"\"
    if not mt5.initialize():
        raise HTTPException(status_code=500, detail="Failed to initialize MT5")

    symbol = request.symbol
    action = request.action.lower()
    volume = float(request.volume)
    price = float(request.price)

    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")

    if not symbol_info.visible:
        if not mt5.symbol_select(symbol, True):
            raise HTTPException(status_code=500, detail=f"Failed to select symbol {symbol}")

    # Determine order type
    if action == "buy_limit":
        order_type = mt5.ORDER_TYPE_BUY_LIMIT
    elif action == "sell_limit":
        order_type = mt5.ORDER_TYPE_SELL_LIMIT
    elif action == "buy_stop":
        order_type = mt5.ORDER_TYPE_BUY_STOP
    elif action == "sell_stop":
        order_type = mt5.ORDER_TYPE_SELL_STOP
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'buy_limit', 'sell_limit', 'buy_stop', or 'sell_stop'.")

    # Prepare MT5 order request
    mt5_request = {
        "action": mt5.TRADE_ACTION_PENDING,
        "symbol": symbol,
        "volume": volume,
        "type": order_type,
        "price": price,
        "deviation": 20,
        "magic": request.magic,
        "comment": "NodeJS Pending Auto Trade",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_RETURN, # Return is often required for pending orders
    }

    if request.sl > 0:
        mt5_request["sl"] = float(request.sl)
    if request.tp > 0:
        mt5_request["tp"] = float(request.tp)

    if request.expiration and request.expiration > 0:
        mt5_request["type_time"] = mt5.ORDER_TIME_SPECIFIED
        mt5_request["expiration"] = request.expiration

    result = mt5.order_send(mt5_request)

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        raise HTTPException(status_code=500, detail=f"Trade failed. Error code: {result.retcode}. Comment: {result.comment}")

    return {
        "status": "success",
        "order_id": result.order,
        "price": price,
        "volume": result.volume
    }

class ModifyTradeRequest(BaseModel):
    ticket: int
    sl: float = 0.0
    tp: float = 0.0

@app.post("/trade/modify")
def modify_trade(request: ModifyTradeRequest):
    \"\"\"
    Modify SL or TP of an active position or pending order
    \"\"\"
    if not mt5.initialize():
        raise HTTPException(status_code=500, detail="Failed to initialize MT5")

    # Check if it's an active position
    position = mt5.positions_get(ticket=request.ticket)

    if position and len(position) > 0:
        pos = position[0]
        modify_request = {
            "action": mt5.TRADE_ACTION_SLTP,
            "symbol": pos.symbol,
            "sl": float(request.sl) if request.sl > 0 else float(pos.sl),
            "tp": float(request.tp) if request.tp > 0 else float(pos.tp),
            "position": pos.ticket
        }
    else:
        # Check if it's a pending order
        order = mt5.orders_get(ticket=request.ticket)
        if order and len(order) > 0:
            ord = order[0]
            modify_request = {
                "action": mt5.TRADE_ACTION_MODIFY,
                "order": ord.ticket,
                "symbol": ord.symbol,
                "price": ord.price_open,
                "sl": float(request.sl) if request.sl > 0 else float(ord.sl),
                "tp": float(request.tp) if request.tp > 0 else float(ord.tp),
                "type_time": ord.type_time,
                "expiration": ord.time_expiration
            }
        else:
            raise HTTPException(status_code=404, detail=f"Position or Order {request.ticket} not found")

    result = mt5.order_send(modify_request)

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        raise HTTPException(status_code=500, detail=f"Modify failed. Error code: {result.retcode}. Comment: {result.comment}")

    return {
        "status": "success",
        "modified_ticket": request.ticket
    }

@app.get("/orders/pending")
def get_pending_orders(symbol: str = None):
    \"\"\"
    Get all active pending orders
    \"\"\"
    if not mt5.initialize():
        raise HTTPException(status_code=500, detail="Failed to initialize MT5")

    if symbol:
        orders = mt5.orders_get(symbol=symbol)
    else:
        orders = mt5.orders_get()

    if orders is None:
        return {"status": "success", "orders": []}

    result = []
    for o in orders:
        # Only include pending order types
        if o.type in [mt5.ORDER_TYPE_BUY_LIMIT, mt5.ORDER_TYPE_SELL_LIMIT, mt5.ORDER_TYPE_BUY_STOP, mt5.ORDER_TYPE_SELL_STOP]:
            order_type_str = ""
            if o.type == mt5.ORDER_TYPE_BUY_LIMIT: order_type_str = "buy_limit"
            elif o.type == mt5.ORDER_TYPE_SELL_LIMIT: order_type_str = "sell_limit"
            elif o.type == mt5.ORDER_TYPE_BUY_STOP: order_type_str = "buy_stop"
            elif o.type == mt5.ORDER_TYPE_SELL_STOP: order_type_str = "sell_stop"

            result.append({
                "ticket": o.ticket,
                "symbol": o.symbol,
                "type": order_type_str,
                "volume": o.volume_initial,
                "price_open": o.price_open,
                "sl": o.sl,
                "tp": o.tp,
                "time_setup": o.time_setup
            })

    return {"status": "success", "orders": result}

class CancelOrderRequest(BaseModel):
    ticket: int

@app.post("/trade/cancel")
def cancel_pending_order(request: CancelOrderRequest):
    \"\"\"
    Cancel a pending order
    \"\"\"
    if not mt5.initialize():
        raise HTTPException(status_code=500, detail="Failed to initialize MT5")

    order = mt5.orders_get(ticket=request.ticket)
    if order is None or len(order) == 0:
        raise HTTPException(status_code=404, detail=f"Pending order {request.ticket} not found")

    ord = order[0]

    cancel_request = {
        "action": mt5.TRADE_ACTION_REMOVE,
        "order": ord.ticket
    }

    result = mt5.order_send(cancel_request)

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        raise HTTPException(status_code=500, detail=f"Cancel failed. Error code: {result.retcode}. Comment: {result.comment}")

    return {
        "status": "success",
        "canceled_ticket": request.ticket
    }

if __name__ == "__main__":
"""

content = content.replace('if __name__ == "__main__":', new_routes)

with open("server/python/mt5_server.py", "w") as f:
    f.write(content)
