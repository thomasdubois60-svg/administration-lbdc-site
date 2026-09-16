'use client';
import styles from './SectionPhoto.module.css';
export default function SectionPhoto({photo,home=false}){const src=photo?.image;if(typeof src!=='string'||!(/^(https:\/\/|\/photos\/)/i.test(src)))return null;return <img className={home?styles.home:styles.banner} src={src.startsWith('/photos/')?'https://raw.githubusercontent.com/thomasdubois60-svg/lebistrotducoin/main/public'+src:src} alt={photo.alt||''} loading={home?'eager':'lazy'}/>}
