import React from 'react';
import { cleanup, fireEvent, within, wait } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MDAI, ETH } from '@makerdao/dai-plugin-mcd';

import CDPDisplay from '../';
import { renderWithAccount } from '../../../../test/helpers/render';
import { instantiateMaker } from '../../../maker';
import { SidebarProvider } from '../../../providers/SidebarProvider';
import SidebarBase from 'components/SidebarBase';
import * as navi from 'react-navi';

const { click, change } = fireEvent;
jest.mock('react-navi');
jest.mock('mixpanel-browser', () => ({
  init: jest.fn(),
  track: jest.fn()
}));

const ILK = 'ETH-A';
const VAULT1_ETH = '5';
const AMOUNT = 210;

let maker;

beforeAll(async () => {
  maker = await instantiateMaker({ network: 'testnet' });
  await maker
    .service('mcd:cdpManager')
    .openLockAndDraw(ILK, ETH(VAULT1_ETH), MDAI(AMOUNT));
});

afterEach(cleanup);

test('Vault Display page and actions', async () => {
  navi.useCurrentRoute.mockReturnValue({ url: { pathname: '/borrow' } });
  const {
    getByText,
    getAllByText,
    getByTestId,
    getByRole,
    findByText,
    debug // eslint-disable-line no-unused-vars
  } = await renderWithAccount(
    <SidebarProvider>
      <CDPDisplay cdpId="1" />
      <SidebarBase />
    </SidebarProvider>
  );

  await findByText('ETH-A Vault #1');
  await findByText('Opened a new Vault with id #', {}, { timeout: 15000 });

  /**Wallet Balances */
  const getBalancesEl = () =>
    getByText('Wallet Balances').parentElement.parentElement;
  const getEthBal = () =>
    within(getBalancesEl()).getByText('ETH').nextElementSibling.textContent;
  const getEthUsdValue = () =>
    within(getBalancesEl()).getByText('ETH').nextElementSibling
      .nextElementSibling.textContent;
  const getDaiBal = () =>
    within(getBalancesEl()).getByText('DAI').nextElementSibling.textContent;
  const getDaiUsdValue = () =>
    within(getBalancesEl()).getByText('DAI').nextElementSibling
      .nextElementSibling.textContent;

  expect(getEthBal()).toContain('70.');
  expect(getEthUsdValue()).toBe('$10.6K');
  expect(getDaiBal()).toContain('210.');
  expect(getDaiUsdValue()).toBe('$210.00');

  /**Deposit */
  click(getByText('Deposit'));
  await findByText(/would you like to deposit/);

  // ETH locked before
  const [, depositLabel] = getAllByText('ETH locked');
  expect(depositLabel.nextElementSibling.textContent).toBe('5.00 ETH');

  // submit deposit
  change(getByRole('textbox'), { target: { value: '2.33' } });
  const [, depSidebarBtn] = getAllByText('Deposit');

  // wait for hasProxy check to complete
  await wait(() => {
    expect(depSidebarBtn).not.toHaveAttribute('disabled');
  });
  click(depSidebarBtn);

  //check event history
  const depEvent = await findByText('2.33', {}, { timeout: 15000 });
  expect(depEvent.parentElement.textContent).toBe(
    'Deposited 2.33 ETH into Vault'
  );

  // check updated balances
  expect(getEthBal()).toContain('68.');
  expect(getEthUsdValue()).toBe('$10.3K');

  /**Generate */
  click(getByText('Generate'));
  await findByText(/would you like to generate/);

  // amount to generate before
  const generateLabel = getByText('Available to generate');
  expect(generateLabel.nextElementSibling.textContent).toBe('523.00 DAI');

  // submit generate
  change(getByRole('textbox'), { target: { value: '25' } });
  const [, genSidebarBtn] = getAllByText('Generate');
  click(genSidebarBtn);

  //check event history
  const genEvent = await findByText('25.00', {}, { timeout: 15000 });
  expect(genEvent.parentElement.textContent).toBe(
    'Generated 25.00 new Dai from Vault'
  );

  // check updated balances
  expect(getDaiBal()).toContain('235.');
  expect(getDaiUsdValue()).toBe('$235.00');

  /**Pay back */
  click(getByText('Pay back'));
  await findByText(/would you like to pay back/);

  // Outstanding Dai debt before
  const [, debtLabel] = getAllByText('Outstanding Dai debt');
  expect(debtLabel.nextElementSibling.textContent).toBe('235.00 DAI');

  // must unlock Dai first
  const allowanceBtn = getByTestId('allowance-toggle').children[1];
  await wait(() => {
    expect(allowanceBtn).not.toHaveAttribute('disabled');
  });
  click(allowanceBtn);
  await findByText('DAI unlocked');

  // submit pay back
  change(getByRole('textbox'), { target: { value: '1.23' } });
  const [, pbSidebarBtn] = getAllByText('Pay back');

  // wait for hasProxy check to complete
  await wait(() => {
    expect(pbSidebarBtn).not.toHaveAttribute('disabled');
  });
  click(pbSidebarBtn);

  //check event history
  const pbEvent = await findByText('1.23', {}, { timeout: 15000 });
  expect(pbEvent.parentElement.textContent).toBe('Repaid 1.23 Dai to Vault');

  // check updated balances
  expect(getDaiBal()).toContain('233.');
  expect(getDaiUsdValue()).toBe('$233.77');

  /**Withdraw */
  click(getByText('Withdraw'));
  await findByText(/would you like to withdraw/);

  // amount to withdraw before
  expect(getByText('Able to withdraw').nextElementSibling.textContent).toBe(
    '4.99 ETH'
  );

  // submit withdraw
  change(getByRole('textbox'), { target: { value: '2' } });
  const [, wdSidebarBtn] = getAllByText('Withdraw');
  click(wdSidebarBtn);

  //check event history
  const wdEvent = await findByText(/Withdrew/, {}, { timeout: 15000 });
  expect(wdEvent.textContent).toBe('Withdrew 2.00 ETH from Vault');

  // check updated balances
  expect(getEthBal()).toContain('70.');
  expect(getEthUsdValue()).toBe('$10.6K');
}, 45000);
