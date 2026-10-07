"use strict";
const BASE="https://maps.googleapis.com/maps/api/geocode/json";
async function geocodeAddress(parts){
 const key=String(process.env.GOOGLE_MAPS_API_KEY||"").trim(); if(!key)return null;
 const address=(Array.isArray(parts)?parts:[parts]).filter(Boolean).map(x=>String(x).trim()).filter(Boolean).join(", "); if(!address)return null;
 try{
  const u=new URL(BASE);u.searchParams.set("address",address);u.searchParams.set("region","ca");u.searchParams.set("key",key);
  const r=await fetch(u,{headers:{Accept:"application/json"}});const j=await r.json();
  if(!r.ok||j.status!=="OK"||!j.results?.[0]?.geometry?.location){console.warn("[geocode]",j.status||r.status,j.error_message||address);return null;}
  const x=j.results[0];return {latitude:Number(x.geometry.location.lat),longitude:Number(x.geometry.location.lng),formatted_address:x.formatted_address||address,place_id:x.place_id||null};
 }catch(e){console.warn("[geocode] erreur",e?.message||e);return null;}
}
module.exports={geocodeAddress};
