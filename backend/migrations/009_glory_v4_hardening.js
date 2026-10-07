"use strict";
const db=require("../config/db");
async function hasColumn(t,c){const [r]=await db.query(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1`,[t,c]);return !!r.length}
async function hasIndex(t,i){const [r]=await db.query(`SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=? LIMIT 1`,[t,i]);return !!r.length}
(async()=>{try{
 for(const [c,sql] of [
  ['cloudinary_url',`ALTER TABLE driver_delivery_proofs ADD COLUMN cloudinary_url VARCHAR(1000) NULL AFTER proof_data`],
  ['cloudinary_public_id',`ALTER TABLE driver_delivery_proofs ADD COLUMN cloudinary_public_id VARCHAR(500) NULL AFTER cloudinary_url`],
  ['closure_address',`ALTER TABLE driver_delivery_proofs ADD COLUMN closure_address VARCHAR(500) NULL AFTER cloudinary_public_id`]
 ]) if(!(await hasColumn('driver_delivery_proofs',c))) await db.query(sql);
 if(!(await hasIndex('order_packages','uq_order_packages_barcode'))){
   const [dups]=await db.query(`SELECT barcode,COUNT(*) n FROM order_packages WHERE barcode IS NOT NULL AND TRIM(barcode)<>'' GROUP BY barcode HAVING COUNT(*)>1 LIMIT 20`);
   if(dups.length){throw new Error('Tracking dupliqué détecté: '+dups.map(x=>`${x.barcode} (${x.n})`).join(', ')+'. Corriger avant ajout UNIQUE. Aucune donnée n’a été supprimée.')}
   await db.query(`ALTER TABLE order_packages ADD UNIQUE KEY uq_order_packages_barcode (barcode)`);
 }
 console.log('Migration V4 OK'); process.exit(0);
}catch(e){console.error('Migration V4 refusée:',e.message);process.exit(1)}})();
