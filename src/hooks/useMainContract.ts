import { useEffect, useState } from "react";
import { MainContract, mainContractConfigToCell } from "../contracts/MainContract";
import { useTonClient } from "./useTonClient";
import { useAsyncInitialize } from "./useAsyncInitialize";
import { address, Address, OpenedContract, toNano, Cell, StateInit, beginCell, storeStateInit, contractAddress } from "ton-core";
import { useTonConnect } from "./useTonConnect";
import { useTonConnectUI } from '@tonconnect/ui-react';
import { TonClient, TonClient4 } from "ton";

async function sleep(time: number) {
	return new Promise((resolve) =>  setTimeout(resolve, time))
}

async function isContractDeployed(client: TonClient, address: Address): Promise<boolean> {
	if (!client)  return false
	
	if (client instanceof TonClient4) {
			return await client.isContractDeployed((await client.getLastBlock()).last.seqno, address);
	} else {
			return (await client.getContractState(address)).state === 'active';
	}
}

function getExplorerLink(address: string, network: string, explorer: string) {
	const networkPrefix = network === 'testnet' ? 'testnet.' : '';

	switch (explorer) {
			case 'tonscan':
					return `https://${networkPrefix}tonscan.org/address/${address}`;

			case 'tonviewer':
					return `https://${networkPrefix}tonviewer.com/${address}`;

			case 'toncx':
					return `https://${networkPrefix}ton.cx/address/${address}`;

			case 'dton':
					return `https://${networkPrefix}dton.io/a/${address}`;

			default:
					return `https://${networkPrefix}tonscan.org/address/${address}`;
	}
}

async function waitForDeploy(client: TonClient ,address: Address, attempts: number = 10, sleepDuration: number = 2000) {
	if (attempts <= 0) {
			throw new Error('Attempt number must be positive');
	}

	for (let i = 1; i <= attempts; i++) {
			console.log(`Awaiting contract deployment... [Attempt ${i}/${attempts}]`);
			const isDeployed = await isContractDeployed(client, address);
			if (isDeployed) {
					
				console.log(`Contract deployed at address ${address.toString()}`);
				console.log(`You can view it at ${getExplorerLink(address.toString(), 'testnet', 'tonscan')}`);
				return;
			}
			await sleep(sleepDuration);
	}

	throw new Error("Contract was not deployed. Check your wallet's transactions");
}

export function useMainContract() {
  const client = useTonClient();
	const { sender } = useTonConnect();
	const [ tonConnectUI ] = useTonConnectUI();
  const [contractData, setContractData] = useState<null | {
    counter_value: number;
    recent_sender: Address;
    owner_address: Address;
  }>();

	const [contract_balance, setContract_balance] = useState<null| number>(0)


	const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

  const mainContract = useAsyncInitialize(async () => {
    if (!client) return;
		// EQAWL6uHm2f0aCQGMl-uy5Q9J_1ThsLhsoYRlZM1dY1Cwr1j
		// EQA__9naZi_M1rems8U48mYwGU4gKWDrnccPHh2mZDUOPXkh
    const contract = new MainContract(
      Address.parse("EQAWL6uHm2f0aCQGMl-uy5Q9J_1ThsLhsoYRlZM1dY1Cwr1j") // replace with your address from tutorial 2 step 8
    );
  	console.log("🚀 ~ mainContract ~ contract:", contract.address.toString())
    return client.open(contract) as OpenedContract<MainContract>;
  }, [client]);

  useEffect(() => {
    async function getValue() {
      if (!mainContract) return;
      setContractData(null);
      const val = await mainContract.getData();

			const balance = await mainContract.getBalance()

			setContract_balance(balance.number)

      setContractData({
        counter_value: val.number,
        recent_sender: val.recent_sender,
        owner_address: val.owner_address,
      });

			await sleep(10000); // sleep 5 seconds and poll value again
      getValue();
    }
    getValue();
  }, [mainContract]);

  return {
    contract_address: mainContract?.address.toString(),
		contract_balance,
    ...contractData,
		sendIncrement: () => {
			return mainContract?.sendIncrement(sender, toNano(0.05), 1);
		},
		sendDeposit: (amount: string) => {
			return mainContract?.sendDeposit(sender, toNano(amount))
		},
		sendWithdraw: (amount: string) => {
			return mainContract?.sendWithdrawRequest(sender, toNano("0.05"), toNano(amount))
		},
		sendDeploy:async () => {
			const codeCell = Cell.fromBase64('te6cckEBBwEAsgABFP8A9KQT9LzyyAsBAgFiBQICASAEAwAPvLYHwTt5EYQAGb9+N2omhpj/0gfSAYQB9tAyIccAkVvg0NMDMfpAMAHTH+1E0NMf+kD6QDAxI8ABjhQzAdMfMKBZAsjLHwHPFgHPFsntVOAxIsACkl8E4ALAA44yUiLHBfLgZ/oAMPgnbyIwUwG+8uBoggiYloChtghxcIAYyMsFUATPFlj6AhLLaskB+wDgXwOEDwYABPLwUwFdSA==');

			const config = {
				number: 0,
				address: address('0QBHjbb14eqYGZZd0Kb5bCACWuEctD1EL8D-Q4wfFnN7yeFe'),
				owner_address: address('0QDXlaM0wDiW-WuuiCHIdc18JRuHwWP5llOcT84Ok7Sh-B0m')
			}
			const dataCell = mainContractConfigToCell(config)

			const stateInit: StateInit = {
				code: codeCell,
				data: dataCell
			}

			const stateInitBuilder = beginCell()

			storeStateInit(stateInit)(stateInitBuilder)

			const stateInitCell = stateInitBuilder.endCell()

			const addr = contractAddress(0, {
				code: codeCell,
				data: dataCell
			})
			
			if (client && await isContractDeployed(client, addr)) {
				console.log(`Contract deployed at address ${addr.toString()}`)
				return
			}

			try {
				await tonConnectUI.sendTransaction({
					messages: [
						{
							address: addr.toString(),
							amount: toNano('0.05').toString(),
							payload: beginCell().endCell().toBoc().toString('base64'),
							stateInit: stateInitCell.toBoc().toString('base64')
						},
					],
					validUntil: Date.now() + 5 * 60 * 1000, // 5 minutes for user to approve
				})

				if (client) {
					waitForDeploy(client, addr)
				}
			} catch (error) {
				  console.error(error)
			}

			// const link = `https://test.tonhub.com/transfer/` + addr.toString({ testOnly: true}) + '?' + qs.stringify({
			// 	text: 'Deploy Contract',
			// 	amount: toNano("0.05").toString(10),
			// 	init: stateInitCell.toBoc({ idx: false }).toString("base64")
			//  })
			//  console.log(link)
		
		}
  };
}
