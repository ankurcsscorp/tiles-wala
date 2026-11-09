import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const DealerCartContext=createContext(null);
const validLine=line=>line&&/^\d+$/.test(String(line.productId))&&/^\d+$/.test(String(line.unitId))&&/^\d{1,14}(\.\d{1,4})?$/.test(String(line.quantity))&&Number(line.quantity)>0;
const storageKey=dealerId=>`tilesWalaDealerCart:${dealerId}`;
const readLines=dealerId=>{if(!dealerId)return[];try{const value=JSON.parse(localStorage.getItem(storageKey(dealerId))||'[]');return Array.isArray(value)?value.filter(validLine):[];}catch{return[];}};
const qtyUnits=value=>{const [whole,fraction='']=String(value).split('.');return window.BigInt(whole||'0')*10000n+window.BigInt(fraction.padEnd(4,'0').slice(0,4));};
const qtyString=value=>`${value/10000n}${value%10000n?`.${String(value%10000n).padStart(4,'0').replace(/0+$/,'')}`:''}`;

export function DealerCartProvider({children}){
 const {user}=useAuth();const dealerId=user?.userType?.toLowerCase()==='dealer'?String(user.id):null;
 const [state,setState]=useState({dealerId,lines:readLines(dealerId)});
 useEffect(()=>{setState({dealerId,lines:readLines(dealerId)});},[dealerId]);
 useEffect(()=>{if(state.dealerId&&state.dealerId===dealerId)localStorage.setItem(storageKey(state.dealerId),JSON.stringify(state.lines));},[state, dealerId]);
 const update=useCallback(fn=>setState(current=>{const currentLines=current.dealerId===dealerId?current.lines:readLines(dealerId);return {dealerId,lines:fn(currentLines)};}),[dealerId]);
 const addItem=useCallback((productId,unitId,quantity)=>{update(current=>{const found=current.find(line=>line.productId===String(productId)&&line.unitId===String(unitId));if(!found)return [...current,{productId:String(productId),unitId:String(unitId),quantity:String(quantity)}];return current.map(line=>line===found?{...line,quantity:qtyString(qtyUnits(line.quantity)+qtyUnits(quantity))}:line);});},[update]);
 const setCartItemQuantity=useCallback((productId,unitId,quantity)=>{const item={productId:String(productId),unitId:String(unitId),quantity:String(quantity)};if(!validLine(item))return;update(current=>{const remaining=current.filter(line=>line.productId!==item.productId||line.unitId!==item.unitId);return [...remaining,item];});},[update]);
 const setQuantity=useCallback((productId,unitId,quantity)=>{if(!validLine({productId,unitId,quantity})){update(current=>current.filter(line=>line.productId!==String(productId)||line.unitId!==String(unitId)));return;}update(current=>current.map(line=>line.productId===String(productId)&&line.unitId===String(unitId)?{...line,quantity:String(quantity)}:line));},[update]);
 const removeItem=useCallback((productId,unitId)=>update(current=>current.filter(line=>line.productId!==String(productId)||line.unitId!==String(unitId))),[update]);
 const clearCart=useCallback(()=>update(()=>[]),[update]);
 const value=useMemo(()=>{const lines=state.dealerId===dealerId?state.lines:[];return {lines,itemCount:lines.length,addItem,setCartItemQuantity,setQuantity,removeItem,clearCart};},[state,dealerId,addItem,setCartItemQuantity,setQuantity,removeItem,clearCart]);
 return <DealerCartContext.Provider value={value}>{children}</DealerCartContext.Provider>;
}
export const useDealerCart=()=>useContext(DealerCartContext)||({lines:[],itemCount:0,addItem:()=>{},setCartItemQuantity:()=>{},setQuantity:()=>{},removeItem:()=>{},clearCart:()=>{}});
