// Copyright 2017-2022 @polkadot/app-contracts authors & contributors
// Copyright 2017-2023 @blockandpurpose.com
// SPDX-License-Identifier: Apache-2.0
import { Input, Label } from 'semantic-ui-react'

import type { SubmittableExtrinsic } from '@polkadot/api/types';
import type { ContractPromise } from '@polkadot/api-contract';
import type { ContractCallOutcome } from '@polkadot/api-contract/types';
import type { WeightV2 } from '@polkadot/types/interfaces';
import type { CallResult } from '../shared/types.js';

import React, { useCallback, useEffect, useState } from 'react';

import { Expander, LabelHelp, Badge, Card, Button, Dropdown, InputAddress, InputBalance, Toggle, TxButton } from '@polkadot/react-components';
import { useAccountId, useApi, useDebounce, useFormField, useToggle } from '@polkadot/react-hooks';
import { Available } from '@polkadot/react-query';
import { BN, BN_ONE, BN_ZERO } from '@polkadot/util';

import InputMegaGas from '../shared/InputMegaGas.js';
import Params from '../shared/Params.js';
import { useTranslation } from '../shared/translate.js';
import useWeight from '../useWeight.js';

import { getCallMessageOptions } from '../shared/util.js';
import SellerDetails from './SellerDetails.js';
import MyCartDetails from './MyCartDetails.js';
import SearchByProductDetails from './SearchByProductDetails.js';
import SearchByServiceDetails from './SearchByServiceDetails.js';
import SearchByStoreDetails from './SearchByStoreDetails.js';
import MyAccountDetails from './MyAccountDetails.js';
import GotoStoreDetails from './GotoStoreDetails.js';

interface Props {
  className?: string;
  contract: ContractPromise;
  messageIndex: number;
  onCallResult?: (messageIndex: number, result?: ContractCallOutcome | void) => void;
  onChangeMessage: (messageIndex: number) => void;
  onClose: () => void;
}

const MAX_CALL_WEIGHT = new BN(5_000_000_000_000).isub(BN_ONE);

function CallCard ({ className = 'callcard', contract, messageIndex, onCallResult, onChangeMessage, onClose }: Props): React.ReactElement<Props> | null {
  //todo: code for unused params:
  console.log(JSON.stringify(className));

  const { t } = useTranslation();
  const { api } = useApi();
  const message = contract.abi.messages[messageIndex];
  const [accountId, setAccountId] = useAccountId();
  const [estimatedWeight, setEstimatedWeight] = useState<BN | null>(null);
  const [estimatedWeightV2, setEstimatedWeightV2] = useState<WeightV2 | null>(null);
  const [value, isValueValid, setValue] = useFormField<BN>(BN_ZERO);
  const [outcomes, setOutcomes] = useState<CallResult[]>([]);
  const [execTx, setExecTx] = useState<SubmittableExtrinsic<'promise'> | null>(null);
  const [params, setParams] = useState<unknown[]>([]);
  const [isViaCall, toggleViaCall] = useToggle();
  
  const weight = useWeight();
  const dbValue = useDebounce(value);
  const dbParams = useDebounce(params);
  const [isCalled, toggleIsCalled] = useToggle(false);
  const boolToString = (_bool: boolean) => _bool? 'Yes': 'No';
  const geodeToZeo = (_string: string) => _string.length>0? (+_string * 1000000000000).toString(): '0';

  const [_username, setUsername] = useState<string>('');
  const [_location, setLocation] = useState<string>('');
  const [_description, setDescription] = useState<string>('');
  const [_bannerUrl, setBannerUrl] = useState<string>('');
  const [_youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [_externalLink, setExternalLink] = useState<string>('');
  const [_title, setTitle] = useState<string>('');
  const [_price, setPrice] = useState<string>('');
  const [_brand, setBrand] = useState<string>('');
  const [_category, setCategory] = useState<string>('');
  const [_inventory, setInventory] = useState<string>('');
  const [_photo1, setPhoto1] = useState<string>('');
  const [_photo2, setPhoto2] = useState<string>('');
  const [_photo3, setPhoto3] = useState<string>('');
  const [_delivery, setDelivery] = useState<string>('');
  const [_zeno, setZeno] = useState<string>('');
  const [_isHide, toggleIsHide] = useToggle(false);

  const isTest: boolean = false;

  useEffect((): void => {
    setEstimatedWeight(null);
    setEstimatedWeightV2(null);
    setParams([]);
  }, [contract, messageIndex]);

  useEffect((): void => {
    value && message.isMutating && setExecTx((): SubmittableExtrinsic<'promise'> | null => {
      try {
        return contract.tx[message.method](
          { gasLimit: weight.isWeightV2 ? weight.weightV2 : weight.weight, storageDepositLimit: null, value: message.isPayable ? value : 0 },
          ...params
        );
      } catch (error) {
        return null;
      }
    });
  }, [accountId, contract, message, value, weight, params]);

  useEffect((): void => {
    if (!accountId || !message || !dbParams || !dbValue) {
      return;
    }
    
  // contract v2 --
  contract
  .query[message.method](accountId, { gasLimit: -1, storageDepositLimit: null, value: message.isPayable ? dbValue : 0 }, ...dbParams)
  .then(({ gasRequired, result }) => {
    if (weight.isWeightV2) {
      setEstimatedWeightV2(
        result.isOk
          ? api.registry.createType('WeightV2', gasRequired)
          : null
      );
    } else {
      setEstimatedWeight(
        result.isOk
          ? gasRequired.refTime.toBn()
          : null
      );
    }
  })
  .catch(() => {
    setEstimatedWeight(null);
    setEstimatedWeightV2(null);
  });
}, [api, accountId, contract, message, dbParams, dbValue, weight.isWeightV2]);

  const _onSubmitRpc = useCallback(
    (): void => {
      if (!accountId || !message || !value || !weight) {
        return;
      }
      {toggleIsCalled()}
      contract
        .query[message.method](
          accountId,
          { gasLimit: weight.isWeightV2 ? weight.weightV2 : weight.isEmpty ? -1 : weight.weight, storageDepositLimit: null, value: message.isPayable ? value : 0 },
          ...params
        )
        .then((result): void => {
          setOutcomes([{
            ...result,
            from: accountId,
            message,
            params,
            when: new Date()
          }, ...outcomes]);
          onCallResult && onCallResult(messageIndex, result);
        })
        .catch((error): void => {
          console.error(error);
          onCallResult && onCallResult(messageIndex);
        });
    },
    [accountId, contract.query, message, messageIndex, onCallResult, outcomes, params, value, weight]
  );

  const _onClearOutcome = useCallback(
    (outcomeIndex: number) =>
      () => setOutcomes([...outcomes.filter((_, index) => index !== outcomeIndex)]),
    [outcomes]
  );

  const isValid = !!(accountId && weight.isValid && isValueValid);
  const isViaRpc = (isViaCall || (!message.isMutating && !message.isPayable));      
  const isClosed = (isCalled && (messageIndex===26 || messageIndex===27 || 
                                 messageIndex===28 || messageIndex===29 ||
                                 messageIndex===30 || messageIndex===31 ||
                                 messageIndex===32 || 
                                 messageIndex===34 || messageIndex===35 ||
                                 messageIndex===36 || messageIndex===37 ||
                                 messageIndex===38 || messageIndex===39));
                               
  return (
  
    <Card >
        <h2>
        <Badge icon='info' color={'blue'} />   
        <strong>{t(' Geode Market ')}{' '}</strong>
        </h2>
        <Expander 
            className='viewInfo'
            isOpen={false}
            summary={<strong>{t('Instructions: ')}</strong>}>
              {messageIndex===35 && (<>
                <h2><strong>{t('Market - My Cart')}</strong></h2><br />
                <strong>{t('Instructions for using My Cart: ')}</strong><br />
                {'(1) '}{t('Select the Account to use for this transaction. ')}<br /> 
                {'(2) '}{t('Click View ')}<br />
                <br />
              </>)}

              {messageIndex===37 && (<>
                <h2><strong>{t('Market - Seller Account')}</strong></h2><br />
                <strong>{t('Instructions for Market Seller Account: ')}</strong><br />
                {'(1) '}{t('Select the Account to use for this transaction. ')}<br /> 
                {'(2) '}{t('Click View ')}<br />
                {t('NOTE: ')}{t('Use the UPDATE button to change Product or Service details.')}
                <br />
              </>)}
              {messageIndex===36 && (<>
                <h2><strong>{t('Market - Go To a Seller Account')}</strong></h2><br />
                <strong>{t('Instructions for Go To a Seller Account: ')}</strong><br />
                {'(1) '}{t('Select the Account to use for this transaction. ')}<br /> 
                {'(2) '}{t('Select the Account of the Store owner. ')}<br />
                {'(3) '}{t('Click View ')}<br />
                <br />
              </>)}
              {messageIndex===34 && (<>
                <h2><strong>{t('Market - My Buyer Account')}</strong></h2><br />
                <strong>{t('Instructions for Getting Your Buyer Account: ')}</strong><br />
                {'(1) '}{t('Select the Account to use for this transaction. ')}<br /> 
                {'(2) '}{t('Click View ')}<br />
                <br />
              </>)}
              {messageIndex===32 && (<>
                <h2><strong>{t('Market - Find Stores')}</strong></h2><br />
                <strong>{t('Instructions for Finding Stores: ')}</strong><br />
                {'(1) '}{t('Select the Account to use for this transaction. ')}<br /> 
                {'(2) '}{t('Enter a Search Keyword for the Stores to find or leave blank to return all available stores. ')}<br /> 
                {'(3) '}{t('Click View ')}<br />
                <br />
              </>)}
              {messageIndex===31 && (<>
                <h2><strong>{t('Market - Find Services')}</strong></h2><br />
                <strong>{t('Instructions for finding Services: ')}</strong><br />
                {'(1) '}{t('Select the Account to use for this transaction. ')}<br /> 
                {'(2) '}{t('Enter a service name to search.')}<br />
                {'(3) '}{t('Click View ')}<br />
                <br />
              </>)}
              {messageIndex===30 && (<>
                <h2><strong>{t('Market - Find Products')}</strong></h2><br />
                <strong>{t('Instructions for finding Products: ')}</strong><br />
                {'(1) '}{t('Select the Account to use for this transaction. ')}<br /> 
                {'(2) '}{t('Enter a product name to search.')}<br />
                {'(3) '}{t('Click View ')}<br />
                <br />
              </>)}
              {messageIndex===28 && (<>
                <h2><strong>{t('Market - Add a New Service')}</strong></h2><br />
                <strong>{t('Instructions for Adding a New Service: ')}</strong><br />
                {'(1) '}{t('Select the Account to use for this transaction.')}<br /> 
                {'(2) '}{t('Fill in your service details.')}<br />
                {'(3) '}{t('Click submit to add the new service.')}<br />
              </>)}
              {messageIndex===26 && (<>
                <h2><strong>{t('Market - Add a New Product')}</strong></h2><br />
                <strong>{t('Instructions for Adding a Product: ')}</strong><br />
                {'(1) '}{t('Select the Account to use for this transaction.')}<br /> 
                {'(2) '}{t('Fill in your product details.')}<br />
                {'(3) '}{t('Click submit to add the new product.')}<br />
                <br />
              </>)}
              {messageIndex===18 && (<>
                <strong>{t('Instructions for Updating Seller Account Information: ')}</strong><br />
                {'(1) '}{t('Select the Account to use for this transaction.')}<br />
                {'(2) '}{t('Enter a Name for the Account.')}<br /> 
                {'(3) '}{t('Enter the Physical Location of the Seller.')}<br /> 
                {'(4) '}{t('Add a description of your Products and/or Services. ')}<br />            
                {'(5) '}{t('Add an Image Link/URL for your Products and/or Services. ')}<br />            
                {'(6) '}{t('Add a YouTube Video for your offerings or business. ')}<br />            
                {'(7) '}{t('Add an additional link for further information. ')}<br />            
                <br /><br />
                {t('⚠️ Please Note: Click Submit to execute this transaction. ')}
              </>)}
        </Expander>
        <br />
        {isTest && (
          <InputAddress
          isDisabled
          label={t('contract to use')}
          type='contract'
          value={contract.address}
          />
        )}

        {!isClosed && (<>
          <InputAddress
          defaultValue={accountId}
          label={t('account to use')}
          labelExtra={
            <Available
              label={t('transferrable')}
              params={accountId}
            />
          }
          onChange={setAccountId}
          type='account'
          value={accountId}
        />        
        </>)}

        {messageIndex !== null && (
          <>
            {isTest && (
            <>
            <Dropdown
              defaultValue={messageIndex}
              isError={message === null}
              label={t('Profile Item')}
              onChange={onChangeMessage}
              options={getCallMessageOptions(contract)}
              value={messageIndex}
              isDisabled
            />              
            </>
            )}
            {messageIndex!=18 && 
             messageIndex!=26 && messageIndex!=28 && !isClosed && (<>             
              <Params
              onChange={setParams}
              params={
                message
                  ? message.args
                  : undefined
              }              
              registry={contract.abi.registry}
            />
            </>)}

            {messageIndex===28 && (<>
              <br /><br />
              <LabelHelp help={t('Select Yes/No as a Online Service.')}/> {' '}         
              <strong>{t('Online Service (Yes/No): ')}</strong>
              <br /><br />
              <Toggle
                className='booleantoggle'
                label={<strong>{t(boolToString(params[0] = _isHide))}</strong>}
                onChange={() => {
                  toggleIsHide()
                  params[0] = !_isHide;
                  setParams([...params]);
                }}
                value={_isHide}
              />
              <br /><br />
              <LabelHelp help={t('Add a service Title.')}/>{' '}          
              <strong>{t('Title: ')}</strong>
              <Input 
                  label={_title.length>0? params[1]=_title: params[1]=''}
                  type="text"
                  value={_title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[1]? 'blue': 'grey'}>
                    {params[1]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter Service Price.')}/>{' '}          
              <strong>{t('Price: ')}</strong>
              <Input 
                  label={_price.length>0? params[2]=geodeToZeo(_price): params[2]=''}
                  type="text"
                  value={_price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[2]? 'blue': 'grey'}>
                    {params[2]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter the Service Categrory.')}/>{' '}          
              <strong>{t('Category: ')}</strong>
              <Input 
                  label={_category.length>0? params[3]=_category: params[3]=''}
                  type="text"
                  value={_category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[3]? 'blue': 'grey'}>
                    {params[3]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Service Description')}/>{' '}          
              <strong>{t('Description: ')}</strong>
              <Input 
                  label={_description.length>0? params[4]=_description: params[4]=''}
                  type="text"
                  value={_description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[4]? 'blue': 'grey'}>
                    {params[4]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter the Service Inventory.')}/>{' '}          
              <strong>{t('Inventory: ')}</strong>
              <Input 
                  label={_inventory.length>0? params[5]=_inventory: params[5]=''}
                  type="text"
                  value={_inventory}
                  onChange={(e) => {
                    setInventory(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[5]? 'blue': 'grey'}>
                    {params[5]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Photo or YouTube link.')}/>{' '}          
              <strong>{t('Photo or YouTube Link: ')}</strong>
              <Input 
                  label={_photo1.length>0? params[6]=_photo1: params[6]=''}
                  type="text"
                  value={_photo1}
                  onChange={(e) => {
                    setPhoto1(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[6]? 'blue': 'grey'}>
                    {params[6]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Photo or YouTube link.')}/>{' '}          
              <strong>{t('Photo or YouTube Link: ')}</strong>
              <Input 
                  label={_photo2.length>0? params[7]=_photo2: params[7]=''}
                  type="text"
                  value={_photo2}
                  onChange={(e) => {
                    setPhoto2(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[7]? 'blue': 'grey'}>
                    {params[7]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Photo or YouTube link.')}/>{' '}          
              <strong>{t('Photo or YouTube Link: ')}</strong>
              <Input 
                  label={_photo3.length>0? params[8]=_photo3: params[8]=''}
                  type="text"
                  value={_photo3}
                  onChange={(e) => {
                    setPhoto3(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[8]? 'blue': 'grey'}>
                    {params[8]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Booking Link.')}/>{' '}          
              <strong>{t('Booking Link: ')}</strong>
              <Input 
                  label={_externalLink.length>0? params[9]=_externalLink: params[9]=''}
                  type="text"
                  value={_externalLink}
                  onChange={(e) => {
                    setExternalLink(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[9]? 'blue': 'grey'}>
                    {params[9]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter Service Location.')}/>{' '}          
              <strong>{t('Service Location: ')}</strong>
              <Input 
                  label={_location.length>0? params[10]=_location: params[10]=''}
                  type="text"
                  value={_location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[10]? 'blue': 'grey'}>
                    {params[10]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter Zeno Percentage.')}/>{' '}          
              <strong>{t('Zeno Percentage: ')}</strong>
              <Input 
                  label={_zeno.length>0? params[11]=_zeno: params[11]=''}
                  type="text"
                  value={_zeno}
                  onChange={(e) => {
                    setZeno(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[11]? 'blue': 'grey'}>
                    {params[11]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <br /><br />
            </>)}

            {messageIndex===26 && (<>
              <br /><br />
              <LabelHelp help={t('Select Yes/No as a Digital Product.')}/> {' '}         
              <strong>{t('Digital Product (Yes/No): ')}</strong>
              <br /><br />
              <Toggle
                className='booleantoggle'
                label={<strong>{t(boolToString(params[0] = _isHide))}</strong>}
                onChange={() => {
                  toggleIsHide()
                  params[0] = !_isHide;
                  setParams([...params]);
                }}
                value={_isHide}
              />
              <br /><br />
              <LabelHelp help={t('Add a product Title.')}/>{' '}          
              <strong>{t('Title: ')}</strong>
              <Input 
                  label={_title.length>0? params[1]=_title: params[1]=''}
                  type="text"
                  value={_title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[1]? 'blue': 'grey'}>
                    {params[1]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter Product Price.')}/>{' '}          
              <strong>{t('Price: ')}</strong>
              <Input 
                  label={_price.length>0? params[2]=geodeToZeo(_price): params[2]=''}
                  type="text"
                  value={_price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[2]? 'blue': 'grey'}>
                    {params[2]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Product Brand.')}/>{' '}          
              <strong>{t('Brand: ')}</strong>
              <Input 
                  label={_brand.length>0? params[3]=_brand: params[3]=''}
                  type="text"
                  value={_brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[3]? 'blue': 'grey'}>
                    {params[3]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a the Product Categrory.')}/>{' '}          
              <strong>{t('Category: ')}</strong>
              <Input 
                  label={_category.length>0? params[4]=_category: params[4]=''}
                  type="text"
                  value={_category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[4]? 'blue': 'grey'}>
                    {params[4]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Product Description')}/>{' '}          
              <strong>{t('Description: ')}</strong>
              <Input 
                  label={_description.length>0? params[5]=_description: params[5]=''}
                  type="text"
                  value={_description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[5]? 'blue': 'grey'}>
                    {params[5]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter the Product Inventory.')}/>{' '}          
              <strong>{t('Inventory: ')}</strong>
              <Input 
                  label={_inventory.length>0? params[6]=_inventory: params[6]=''}
                  type="text"
                  value={_inventory}
                  onChange={(e) => {
                    setInventory(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[6]? 'blue': 'grey'}>
                    {params[6]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Photo or YouTube link.')}/>{' '}          
              <strong>{t('Photo or YouTube Link: ')}</strong>
              <Input 
                  label={_photo1.length>0? params[7]=_photo1: params[7]=''}
                  type="text"
                  value={_photo1}
                  onChange={(e) => {
                    setPhoto1(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[7]? 'blue': 'grey'}>
                    {params[7]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Photo or YouTube link.')}/>{' '}          
              <strong>{t('Photo or YouTube Link: ')}</strong>
              <Input 
                  label={_photo2.length>0? params[8]=_photo2: params[8]=''}
                  type="text"
                  value={_photo2}
                  onChange={(e) => {
                    setPhoto2(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[8]? 'blue': 'grey'}>
                    {params[8]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Photo or YouTube link.')}/>{' '}          
              <strong>{t('Photo or YouTube Link: ')}</strong>
              <Input 
                  label={_photo3.length>0? params[9]=_photo3: params[9]=''}
                  type="text"
                  value={_photo3}
                  onChange={(e) => {
                    setPhoto3(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[9]? 'blue': 'grey'}>
                    {params[9]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a link to further information.')}/>{' '}          
              <strong>{t('Further Information Link: ')}</strong>
              <Input 
                  label={_externalLink.length>0? params[10]=_externalLink: params[10]=''}
                  type="text"
                  value={_externalLink}
                  onChange={(e) => {
                    setExternalLink(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[10]? 'blue': 'grey'}>
                    {params[10]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter information for delivery.')}/>{' '}          
              <strong>{t('Delivery Information: ')}</strong>
              <Input 
                  label={_delivery.length>0? params[11]=_delivery: params[11]=''}
                  type="text"
                  value={_delivery}
                  onChange={(e) => {
                    setDelivery(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[11]? 'blue': 'grey'}>
                    {params[11]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter Product Location.')}/>{' '}          
              <strong>{t('Product Location: ')}</strong>
              <Input 
                  label={_location.length>0? params[12]=_location: params[12]=''}
                  type="text"
                  value={_location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[12]? 'blue': 'grey'}>
                    {params[12]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter Digital File URL.')}/>{' '}          
              <strong>{t('Digital File URL: ')}</strong>
              <Input 
                  label={_bannerUrl.length>0? params[13]=_bannerUrl: params[13]=''}
                  type="text"
                  value={_bannerUrl}
                  onChange={(e) => {
                    setBannerUrl(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[13]? 'blue': 'grey'}>
                    {params[13]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter Zeno Percentage.')}/>{' '}          
              <strong>{t('Zeno Percentage: ')}</strong>
              <Input 
                  label={_zeno.length>0? params[14]=_zeno: params[14]=''}
                  type="text"
                  value={_zeno}
                  onChange={(e) => {
                    setZeno(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[14]? 'blue': 'grey'}>
                    {params[14]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <br /><br />
            </>)}

            {messageIndex===18 && (<>
              <LabelHelp help={t('Update Your Seller Name.')}/>{' '}          
              <strong>{t('Seller Name: ')}</strong>
              <Input 
                  label={_username.length>0? params[0]=_username: params[0]=''}
                  type="text"
                  value={_username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[0]? 'blue': 'grey'}>
                    {params[0]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter Seller Location.')}/>{' '}          
              <strong>{t('Seller Location: ')}</strong>
              <Input 
                  label={_location.length>0? params[1]=_location: params[1]=''}
                  type="text"
                  value={_location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[1]? 'blue': 'grey'}>
                    {params[1]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Description.')}/>{' '}          
              <strong>{t('Description: ')}</strong>
              <Input 
                  label={_description.length>0? params[2]=_description: params[2]=''}
                  type="text"
                  value={_description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[2]? 'blue': 'grey'}>
                    {params[2]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a Banner URL.')}/>{' '}          
              <strong>{t('Banner URL: ')}</strong>
              <Input 
                  label={_bannerUrl.length>0? params[3]=_bannerUrl: params[3]=''}
                  type="text"
                  value={_bannerUrl}
                  onChange={(e) => {
                    setBannerUrl(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[3]? 'blue': 'grey'}>
                    {params[3]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a YouTube URL.')}/>{' '}          
              <strong>{t('YouTube URL: ')}</strong>
              <Input 
                  label={_youtubeUrl.length>0? params[4]=_youtubeUrl: params[4]=''}
                  type="text"
                  value={_youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[4]? 'blue': 'grey'}>
                    {params[4]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <LabelHelp help={t('Enter a link for further information.')}/>{' '}          
              <strong>{t('Further Information Link: ')}</strong>
              <Input 
                  label={_externalLink.length>0? params[5]=_externalLink: params[5]=''}
                  type="text"
                  value={_externalLink}
                  onChange={(e) => {
                    setExternalLink(e.target.value);
                    setParams([...params]);
                  }}
              ><input />
              <Label color={params[5]? 'blue': 'grey'}>
                    {params[5]? <>{t('OK')}</>:<>{t('Enter Value')}</>}</Label>
              </Input>

              <br /><br />
            </>)}
          </>
        )}




        {message.isPayable && (
          <InputBalance
            isError={!isValueValid}
            isZeroable
            label={t('value')}
            onChange={setValue}
            value={value}
          />
        )}
        {isTest && (
        <>
        <Badge color='green' icon='hand'/>
          {t('Gas Required - Information Only')}
        <InputMegaGas
          estimatedWeight={message.isMutating ? estimatedWeight : MAX_CALL_WEIGHT}
          estimatedWeightV2={message.isMutating
            ? estimatedWeightV2
            : api.registry.createType('WeightV2', {
              proofSize: new BN(1_000_000),
              refTIme: MAX_CALL_WEIGHT
            })
          }
          help={t('The maximum amount of gas to use for this contract call. If the call requires more, it will fail.')}
          isCall={!message.isMutating}
          weight={weight}
        />
        {message.isMutating && (
          <Toggle
            className='rpc-toggle'
            label={t('read contract only, no execution')}
            onChange={toggleViaCall}
            value={isViaCall}
          />
        )}        
        </>
        )}

{!isClosed && (
        <>
        <Card>
        {isViaRpc
          ? ( <>
              <Button
              icon='sign-in-alt'
              isDisabled={!isValid}
              label={t('View')}
              onClick={_onSubmitRpc} 
              />
              </>
            ) : (
            <TxButton
              accountId={accountId}
              extrinsic={execTx}
              icon='sign-in-alt'
              isDisabled={!isValid || !execTx}
              label={t('Submit')}
              onStart={onClose}
            />
          )
        }      
        </Card>    
        </>
        )}

        {outcomes.length > 0 && messageIndex===30 && (
            <div>
            {outcomes.map((outcome, index): React.ReactNode => (
              <SearchByProductDetails
                key={`outcome-${index}`}
                onClear={_onClearOutcome(index)}
                outcome={outcome}
              />
            ))}
            </div>
        )}

        {outcomes.length > 0 && messageIndex===31 && (
            <div>
            {outcomes.map((outcome, index): React.ReactNode => (
              <SearchByServiceDetails
                key={`outcome-${index}`}
                onClear={_onClearOutcome(index)}
                outcome={outcome}
              />
            ))}
            </div>
        )}

        {outcomes.length > 0 && messageIndex===32 && (
            <div>
            {outcomes.map((outcome, index): React.ReactNode => (
              <SearchByStoreDetails
                key={`outcome-${index}`}
                onClear={_onClearOutcome(index)}
                outcome={outcome}
              />
            ))}
            </div>
        )}

        {outcomes.length > 0 && messageIndex===34 && (
            <div>
            {outcomes.map((outcome, index): React.ReactNode => (
              <MyAccountDetails
                key={`outcome-${index}`}
                onClear={_onClearOutcome(index)}
                outcome={outcome}
              />
            ))}
            </div>
        )}

        {outcomes.length > 0 && messageIndex===35 && (
            <div>
            {outcomes.map((outcome, index): React.ReactNode => (
              <MyCartDetails
                key={`outcome-${index}`}
                onClear={_onClearOutcome(index)}
                outcome={outcome}
              />
            ))}
            </div>
        )}

        {outcomes.length > 0 && messageIndex===36 && (
            <div>
            {outcomes.map((outcome, index): React.ReactNode => (
              <GotoStoreDetails
                key={`outcome-${index}`}
                onClear={_onClearOutcome(index)}
                outcome={outcome}
              />
            ))}
            </div>
        )}

        {outcomes.length > 0 && messageIndex===37 && (
            <div>
            {outcomes.map((outcome, index): React.ReactNode => (
              <SellerDetails
                key={`outcome-${index}`}
                onClear={_onClearOutcome(index)}
                outcome={outcome}
              />
            ))}
            </div>
        )}
        </Card>
  );
}

export default React.memo(CallCard);
//   .rpc-toggle {
//     margin-top: 1rem;
//     display: flex;
//     justify-content: flex-end;
//   }
//   .clear-all {
//     float: right;
//   }
//   .outcomes {
//     margin-top: 1rem;
//   }
// `);


