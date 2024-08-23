import './App.css'
import { TonConnectButton } from '@tonconnect/ui-react'
import { useMainContract } from './hooks/useMainContract'
import { useTonConnect } from './hooks/useTonConnect'
import { fromNano } from 'ton-core'
import { useState } from 'react'

function App() {
  const {
    contract_address,
    counter_value,
    recent_sender,
    owner_address,
    contract_balance,
    sendIncrement,
    sendDeposit,
    sendWithdraw,
    sendDeploy,
  } = useMainContract()

  const { connected } = useTonConnect()
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [depositAmount, setDepositAmount] = useState('')

  const handleDepositChange = (event: any) => {
    setDepositAmount(event.target.value)
  }

  const handleChange = (event: any) => {
    setWithdrawAmount(event.target.value)
  }

  return (
    <div>
      <div>
        <TonConnectButton />
      </div>
      <div>
        <div className="Card">
          <b>Our contract Address</b>
          <div className="Hint">{contract_address}</div>
          <b>Our contract Balance</b>
          <div className="Hint">{contract_balance && fromNano(contract_balance)}</div>
          <b>Our Recent Sender</b>
          <div className="Hint">{recent_sender?.toString() ?? 'Loading...'}</div>
          <b>Our Owner Address</b>
          <div className="Hint">{owner_address?.toString() ?? 'Loading...'}</div>
        </div>

        <div className="Card">
          <b>Counter Value</b>
          <div>{counter_value ?? 'Loading...'}</div>
        </div>

        {connected && (
          <a
            onClick={() => {
              sendIncrement()
            }}
          >
            Increment
          </a>
        )}
        <br />
        {connected && (
          <div>
            <input type="text" value={depositAmount} onInput={handleDepositChange} placeholder="请输入充值金额"></input>
            <a
              onClick={() => {
                sendDeposit(depositAmount)
              }}
            >
              Deposit
            </a>
          </div>
        )}

        <br />

        {connected && (
          <div>
            <input type="text" value={withdrawAmount} onInput={handleChange} placeholder="请输入提现金额"></input>
            <a
              onClick={() => {
                sendWithdraw(withdrawAmount)
              }}
            >
              Withdraw
            </a>
          </div>
        )}
        <br />
        {/* {connected && (
              <a
                onClick={() => {
                  sendDeploy();
                }}
              >
                Deploy
              </a>
            )} */}
      </div>
    </div>
  )
}

export default App
