export const wineTypes = [{value:'red',label:'Rouge'},{value:'white',label:'Blanc'},{value:'rose',label:'Rosé'},{value:'sparkling',label:'Pétillant / Champagne'}];
export function isWineCategory(category){
 const name=(category?._sourceCategory||category?.category||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 return /^vins? (au verre|en bouteilles?)$/.test(name);
}
