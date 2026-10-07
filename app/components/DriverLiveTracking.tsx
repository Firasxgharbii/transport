"use client";
import {useEffect,useRef,useState} from "react";
const API=process.env.NEXT_PUBLIC_API_URL||"https://api.glorysolutions.ca";
function token(){return localStorage.getItem('glory_token')||sessionStorage.getItem('glory_token')||localStorage.getItem('token')||sessionStorage.getItem('token')||''}
export default function DriverLiveTracking(){
 const [state,setState]=useState<'starting'|'live'|'denied'|'unsupported'>('starting'); const last=useRef(0);
 useEffect(()=>{if(!navigator.geolocation){setState('unsupported');return} let active=true;
  const id=navigator.geolocation.watchPosition(async p=>{if(!active)return; setState('live'); const now=Date.now(); if(now-last.current<7000)return; last.current=now;
   try{await fetch(API+'/api/tracking/location',{method:'POST',headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json'},body:JSON.stringify({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,speed:p.coords.speed,heading:p.coords.heading,recorded_at:new Date(p.timestamp).toISOString()}),keepalive:true})}catch{}
  },()=>setState('denied'),{enableHighAccuracy:true,maximumAge:3000,timeout:15000});
  return()=>{active=false;navigator.geolocation.clearWatch(id)};
 },[]);
 return <div aria-live="polite" style={{position:'fixed',right:10,bottom:10,zIndex:9999,padding:'7px 10px',borderRadius:999,background:'#111',color:'#fff',fontSize:12,fontWeight:800,boxShadow:'0 3px 14px rgba(0,0,0,.2)'}}>{state==='live'?'● GPS LIVE':state==='denied'?'GPS désactivé':state==='unsupported'?'GPS indisponible':'GPS…'}</div>
}
