import React, { useReducer, useEffect, useMemo } from 'react';
import { hot } from 'react-hot-loader/root';
import StepperUI from 'components/StepperUI';
import StepperHeader from 'components/StepperHeader';
import {
  DSRDepositCheckProxy,
  DSRDepositCreate,
  DSRDepositConfirm
} from 'components/DSRDepositScreens';
import useMaker from 'hooks/useMaker';
import useLanguage from 'hooks/useLanguage';
import { TxLifecycle } from 'utils/constants';

const initialState = {
  step: 0,
  proxyAddress: null,
  daiToJoin: '',
  depositAmount: '',
  txState: ''
};

function reducer(state, action) {
  const { type, payload } = action;
  switch (type) {
    case 'increment-step':
      return {
        ...state,
        step: state.step + ((payload && payload.by) || 1)
      };
    case 'decrement-step':
      return {
        ...state,
        step: state.step - ((payload && payload.by) || 1)
      };
    case 'set-proxy-address':
      return {
        ...state,
        proxyAddress: payload.address
      };
    case 'form/set-deposit-amount':
      return { ...state, depositAmount: payload.depositAmount };
    case 'transaction-confirmed':
      return { ...state, txState: TxLifecycle.CONFIRMED };
    case 'reset':
      return { ...initialState };
    default:
      return state;
  }
}

function DSRDeposit({ onClose, hideOnboarding }) {
  const { maker, account } = useMaker();
  const { lang } = useLanguage();
  const [{ step, proxyAddress, depositAmount, txState }, dispatch] = useReducer(
    reducer,
    initialState
  );

  const screens = useMemo(
    () => [
      [
        lang.dsr_deposit.screen_titles.open_vault,
        props => <DSRDepositCheckProxy {...props} />
      ],
      [
        lang.dsr_deposit.screen_titles.deposit_dai,
        props => <DSRDepositCreate {...props} />
      ],
      [
        lang.dsr_deposit.screen_titles.confirmation,
        props => <DSRDepositConfirm {...props} />
      ]
    ],
    [lang]
  );

  useEffect(() => {
    const checkProxy = async () => {
      try {
        const address = await maker.service('proxy').currentProxy();
        dispatch({ type: 'set-proxy-address', payload: { address } });
      } catch (err) {}
    };

    checkProxy();
  }, [maker, account]);

  useEffect(() => {
    if (proxyAddress) {
      hideOnboarding();
    }
  }, [hideOnboarding, proxyAddress]);

  const screenProps = {
    proxyAddress,
    depositAmount,
    dispatch,
    onClose,
    txState
  };

  return (
    <StepperUI
      step={step}
      steps={screens.map(([title]) => title)}
      renderStepperHeader={() => <StepperHeader onClose={onClose} />}
    >
      {screens.map(([, getComponent], screenIndex) =>
        getComponent({ ...screenProps, screenIndex, key: screenIndex })
      )}
    </StepperUI>
  );
}

export default hot(DSRDeposit);
