export const wineTypes = [{value:'red',label:'Rouge'},{value:'white',label:'Blanc'},{value:'rose',label:'Rosé'},{value:'sparkling',label:'Pétillant / Champagne'}];
export function isWineCategory(category){
 const name=(category?._sourceCategory||category?.category||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 // Recognize the existing published labels without renaming categories or using product names.
 return /^(?:(?:nos?|les) |(?:notre|la) selection de )?vins? (au verre(?: et (?:au )?pichets?)?|en bouteilles?)$/.test(name);
}
