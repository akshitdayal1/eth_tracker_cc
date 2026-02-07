import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import './App.css'

interface PriceData {
  usd: number
  usd_24h_change: number
}

interface ChartData {
  timestamp: number
  price: number
  date?: string
}

interface HistoricalData {
  date: string
  price: number
}

function App() {
  const [ethPrice, setEthPrice] = useState<number | null>(null)
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fetchEthPrice = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true',
        { method: 'GET', headers: { 'Accept': 'application/json' } }
      )
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: { ethereum: PriceData } = await response.json()
      setEthPrice(data.ethereum.usd)
      setPriceChange24h(data.ethereum.usd_24h_change)
      setLastUpdate(new Date())
      setError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch ETH price'
      setError(`Error: ${errorMsg}. Retrying...`)
      console.error('Fetch error:', err)
    }
  }

  const fetchChartData = async () => {
    try {
      const days = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=${days}`,
        { method: 'GET', headers: { 'Accept': 'application/json' } }
      )
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const formattedData = data.prices.map((price: [number, number]) => ({
        timestamp: price[0],
        price: price[1],
      }))
      setChartData(formattedData)
    } catch (err) {
      console.error('Failed to fetch chart data:', err)
    }
  }

  const fetchHistoricalData = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=3650',
        { method: 'GET', headers: { 'Accept': 'application/json' } }
      )
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const formattedData = data.prices.map((price: [number, number]) => ({
        date: new Date(price[0]).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        price: Math.round(price[1] * 100) / 100,
      }))
      // Downsample to every 30 days to keep chart readable (10 years ≈ 120 data points)
      const downsampled = formattedData.filter((_, idx) => idx % 30 === 0)
      setHistoricalData(downsampled)
    } catch (err) {
      console.error('Failed to fetch historical data:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    
    const initializeData = async () => {
      await fetchEthPrice()
      await fetchChartData()
      await fetchHistoricalData()
      setLoading(false)
    }
    
    initializeData()

    const interval = setInterval(() => {
      fetchEthPrice()
    }, 15000) // Update every 15 seconds
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchChartData()
  }, [timeframe])

  const minPrice = chartData.length > 0 ? Math.min(...chartData.map(d => d.price)) : 0
  const maxPrice = chartData.length > 0 ? Math.max(...chartData.map(d => d.price)) : 0
  const avgPrice = chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length : 0

  return (
    <div className="app">
      <header className="header">
        <h1>🪙 ETH Price Tracker</h1>
        <p>Real-time Ethereum Price Monitoring</p>
      </header>

      <main className="container">
        {loading && <div className="loading">Loading...</div>}
        {error && (
          <div className="error">
            {error}
            <button className="retry-btn" onClick={() => fetchEthPrice()}>Retry</button>
          </div>
        )}

        {ethPrice !== null && (
          <>
            <div className="price-card">
              <div className="price-display">
                <h2>ETH/USD</h2>
                <div className="price-value">
                  ${ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`price-change ${priceChange24h! >= 0 ? 'positive' : 'negative'}`}>
                  {priceChange24h! >= 0 ? '▲' : '▼'} {Math.abs(priceChange24h!).toFixed(2)}% (24h)
                </div>
              </div>
              {lastUpdate && (
                <div className="last-update">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">24h High</div>
                <div className="stat-value">${maxPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">24h Low</div>
                <div className="stat-value">${minPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">24h Average</div>
                <div className="stat-value">${avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="chart-section">
              <div className="chart-header">
                <h3>Short-term Price Movement</h3>
              </div>
              <div className="timeframe-buttons">
                <button
                  className={`btn ${timeframe === '24h' ? 'active' : ''}`}
                  onClick={() => setTimeframe('24h')}
                >
                  24h
                </button>
                <button
                  className={`btn ${timeframe === '7d' ? 'active' : ''}`}
                  onClick={() => setTimeframe('7d')}
                >
                  7d
                </button>
                <button
                  className={`btn ${timeframe === '30d' ? 'active' : ''}`}
                  onClick={() => setTimeframe('30d')}
                >
                  30d
                </button>
              </div>

              <div className="simple-chart">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none">
                  <polyline
                    points={chartData
                      .map((d, idx) => {
                        const x = (idx / (chartData.length - 1)) * 100
                        const y = 50 - ((d.price - minPrice) / (maxPrice - minPrice)) * 50
                        return `${x},${y}`
                      })
                      .join(' ')}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                  />
                </svg>
              </div>
            </div>

            <div className="chart-section historical-chart-section">
              <div className="chart-header">
                <h3>10-Year Price History</h3>
              </div>
              {loadingHistory ? (
                <div className="loading">Loading 10-year data...</div>
              ) : historicalData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fontSize: 12 }}
                      interval={Math.floor(historicalData.length / 6)}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Price (USD)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(0,0,0,0.8)',
                        border: '1px solid #667eea',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => `$${(value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#667eea"
                      dot={false}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="error">Failed to load historical data</div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>Data from CoinGecko • Updates every 15 seconds</p>
      </footer>
    </div>
  )
}

export default App
