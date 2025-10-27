import { useState } from 'react'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles'
import Sheet from '@mui/joy/Sheet'
import Container from '@mui/joy/Container'
import Tabs from '@mui/joy/Tabs'
import TabList from '@mui/joy/TabList'
import Tab from '@mui/joy/Tab'
import TabPanel from '@mui/joy/TabPanel'
import Stack from '@mui/joy/Stack'
import Grid from '@mui/joy/Grid'
import Typography from '@mui/joy/Typography'
import Input from '@mui/joy/Input'
import Button from '@mui/joy/Button'
import Select from '@mui/joy/Select'
import Option from '@mui/joy/Option'
import Alert from '@mui/joy/Alert'
import Link from '@mui/joy/Link'
import Divider from '@mui/joy/Divider'
import IconButton from '@mui/joy/IconButton'
import Card from '@mui/joy/Card'
import CardContent from '@mui/joy/CardContent'
import Tooltip from '@mui/joy/Tooltip'
import { ContentCopy, Launch, CheckCircle, Warning } from '@mui/icons-material'
import './App.css'

function getExplorerBase(network) {
  return network === 'bscMainnet' ? 'https://bscscan.com' : 'https://testnet.bscscan.com'
}

const theme = extendTheme({
  colorSchemes: {
    dark: {
      palette: {
        primary: { solidBg: '#14b8a6', solidHoverBg: '#0f766e' },
        background: { body: '#0f1115' },
      },
    },
  },
  fontFamily: {
    body: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  },
})

function DeployForm({ network }) {
  const [tokenName, setTokenName] = useState('My Token')
  const [tokenSymbol, setTokenSymbol] = useState('MTK')
  const [totalSupply, setTotalSupply] = useState('1000000000')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenName, tokenSymbol, totalSupply, network })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setResult(data)
    } catch (err) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="outlined">
      <form onSubmit={onSubmit}>
        <CardContent>
          <Stack spacing={2} useFlexGap>
            <Grid container spacing={2} columns={12}>
              <Grid xs={12} sm={6}>
                <Stack spacing={0.5}>
                  <Typography level="title-sm">Token Name</Typography>
                  <Input placeholder="My Token" required value={tokenName} onChange={(e) => setTokenName(e.currentTarget.value)} />
                </Stack>
              </Grid>
              <Grid xs={12} sm={6}>
                <Stack spacing={0.5}>
                  <Typography level="title-sm">Symbol</Typography>
                  <Input placeholder="MTK" required value={tokenSymbol} onChange={(e) => setTokenSymbol(e.currentTarget.value)} />
                </Stack>
              </Grid>
            </Grid>
            <Grid container spacing={2} columns={12}>
              <Grid xs={12} sm={6}>
                <Stack spacing={0.5}>
                  <Typography level="title-sm">Total Supply</Typography>
                  <Input type="number" placeholder="1000000" required value={totalSupply} onChange={(e) => setTotalSupply(e.target.value)} />
                </Stack>
              </Grid>
              <Grid xs={12} sm={6}></Grid>
            </Grid>
            <Button type="submit" loading={loading}>Deploy Token</Button>
            {result && (
              <Alert color={result.error ? 'danger' : 'success'} startDecorator={result.error ? <Warning /> : <CheckCircle />}>
                {result.error ? (
                  <Typography>{result.error}</Typography>
                ) : (
                  <Stack direction="row" spacing={1} useFlexGap alignItems="center">
                    <Typography>Deployed contract:</Typography>
                    <Link href={`${getExplorerBase(network)}/address/${result.tokenAddress}`} target="_blank">{result.tokenAddress}</Link>
                    <Tooltip title="Open in explorer"><IconButton variant="soft" size="sm" component="a" href={`${getExplorerBase(network)}/address/${result.tokenAddress}`} target="_blank"><Launch fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Copy"><IconButton variant="soft" size="sm" onClick={() => navigator.clipboard.writeText(result.tokenAddress)}><ContentCopy fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                )}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </form>
    </Card>
  )
}

function AddLiquidityForm({ network }) {
  const [tokenAddress, setTokenAddress] = useState('')
  const [bnbAmount, setBnbAmount] = useState('0.1')
  const [tokenPercentage, setTokenPercentage] = useState(50)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/addLiquidity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress, bnbAmount, tokenPercentage, network })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setResult(data)
    } catch (err) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="outlined">
      <form onSubmit={onSubmit}>
        <CardContent>
          <Stack spacing={2} useFlexGap>
            <Stack spacing={0.5}>
              <Typography level="title-sm">Token Address</Typography>
              <Input placeholder="0x..." required value={tokenAddress} onChange={(e) => setTokenAddress(e.currentTarget.value)} />
            </Stack>
            <Grid container spacing={2} columns={12}>
              <Grid xs={12} sm={4}>
                <Stack spacing={0.5}>
                  <Typography level="title-sm">BNB Amount</Typography>
                  <Input type="number" placeholder="0.1" required value={bnbAmount} onChange={(e) => setBnbAmount(e.target.value)} />
                </Stack>
              </Grid>
              <Grid xs={12} sm={4}>
                <Stack spacing={0.5}>
                  <Typography level="title-sm">Token % of balance</Typography>
                  <Input type="number" required value={tokenPercentage} onChange={(e) => setTokenPercentage(Number(e.target.value) || 0)} />
                </Stack>
              </Grid>
              <Grid xs={12} sm={4}></Grid>
            </Grid>
            <Button type="submit" loading={loading}>Add Liquidity</Button>
            {result && (
              <Alert color={result.error ? 'danger' : 'success'} startDecorator={result.error ? <Warning /> : <CheckCircle />}>
                {result.error ? (
                  <Typography>{result.error}</Typography>
                ) : (
                  <Stack direction="row" spacing={1} useFlexGap alignItems="center">
                    <Typography>Transaction:</Typography>
                    <Link href={`${getExplorerBase(network)}/tx/${result.txHash}`} target="_blank">{result.txHash}</Link>
                    <Tooltip title="Open in explorer"><IconButton variant="soft" size="sm" component="a" href={`${getExplorerBase(network)}/tx/${result.txHash}`} target="_blank"><Launch fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Copy"><IconButton variant="soft" size="sm" onClick={() => navigator.clipboard.writeText(result.txHash)}><ContentCopy fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                )}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </form>
    </Card>
  )
}

function RemoveLiquidityForm({ network }) {
  const [tokenAddress, setTokenAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/removeLiquidity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress, network })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setResult(data)
    } catch (err) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="outlined">
      <form onSubmit={onSubmit}>
        <CardContent>
          <Stack spacing={2} useFlexGap>
            <Grid container spacing={2} columns={12}>
              <Grid xs={12}>
                <Stack spacing={0.5}>
                  <Typography level="title-sm">Token Address</Typography>
                  <Input placeholder="0x..." required value={tokenAddress} onChange={(e) => setTokenAddress(e.currentTarget.value)} />
                </Stack>
              </Grid>
            </Grid>
            <Button type="submit" loading={loading}>Remove Liquidity</Button>
            {result && (
              <Alert color={result.error ? 'danger' : 'success'} startDecorator={result.error ? <Warning /> : <CheckCircle />}>
                {result.error ? (
                  <Typography>{result.error}</Typography>
                ) : (
                  <Stack direction="row" spacing={1} useFlexGap alignItems="center">
                    <Typography>Transaction:</Typography>
                    <Link href={`${getExplorerBase(network)}/tx/${result.txHash}`} target="_blank">{result.txHash}</Link>
                    <Tooltip title="Open in explorer"><IconButton variant="soft" size="sm" component="a" href={`${getExplorerBase(network)}/tx/${result.txHash}`} target="_blank"><Launch fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Copy"><IconButton variant="soft" size="sm" onClick={() => navigator.clipboard.writeText(result.txHash)}><ContentCopy fontSize="small" /></IconButton></Tooltip>
                  </Stack>
                )}
              </Alert>
            )}
          </Stack>
        </CardContent>
      </form>
    </Card>
  )
}

function App() {
  const [network, setNetwork] = useState('bscTestnet')
  return (
    <CssVarsProvider defaultMode="dark" theme={theme} modeStorageKey="joy-mode">
      <Sheet variant="soft" sx={{ minHeight: '100vh', bgcolor: 'background.body' }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Stack spacing={2} alignItems="center" justifyContent="center">
            <Stack direction="row" spacing={10} alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'nowrap', maxWidth: '900px' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography level="h3" noWrap>BEP20 Token Tools</Typography>
                {/* <Divider orientation="vertical" /> */}
                {/* <Typography level="body-sm" color="neutral" noWrap>Deploy and manage liquidity</Typography> */}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography level="title-sm">Network</Typography>
                <Select value={network} onChange={(_, v) => setNetwork(v || 'bscTestnet')} sx={{ minWidth: 160 }}>
                  <Option value="bscTestnet">BSC Testnet</Option>
                  <Option value="bscMainnet">BSC Mainnet</Option>
                </Select>
              </Stack>
            </Stack>
          </Stack>
        </Container>
        <Container maxWidth="sm" sx={{ pb: 4 }}>
          <Tabs defaultValue={0} variant="soft" size="md">
            <TabList sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              <Tab>Deploy Token</Tab>
              <Tab>Add Liquidity</Tab>
              <Tab>Remove Liquidity</Tab>
            </TabList>
            <TabPanel value={0} sx={{ px: 0 }}>
              <DeployForm network={network} />
            </TabPanel>
            <TabPanel value={1} sx={{ px: 0 }}>
              <AddLiquidityForm network={network} />
            </TabPanel>
            <TabPanel value={2} sx={{ px: 0 }}>
              <RemoveLiquidityForm network={network} />
            </TabPanel>
          </Tabs>
        </Container>
      </Sheet>
    </CssVarsProvider>
  )
}

export default App
