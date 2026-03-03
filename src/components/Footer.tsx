export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50 mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-gray-500 text-sm max-w-3xl mx-auto leading-relaxed">
          <strong className="text-gray-400">Disclaimer:</strong> This website provides educational and informational trading signals only and does not constitute financial advice. Trading foreign exchange on margin carries a high level of risk and may not be suitable for all investors. Past performance is not indicative of future results.
        </p>
        <div className="mt-4 text-xs text-gray-600">
          &copy; {new Date().getFullYear()} SMC Sniper. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
