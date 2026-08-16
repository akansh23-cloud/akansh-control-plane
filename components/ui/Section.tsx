import { cx } from '@/lib/utils';
type SectionProps={id:string;index?:string;eyebrow?:string;className?:string;children:React.ReactNode};
export default function Section({id,index,eyebrow,className,children}:SectionProps){return <section id={id} className={cx('relative border-t border-line py-24 sm:py-32',className)}><div className="shell">{(index||eyebrow)&&<div className="mb-10 flex items-baseline gap-4">{index&&<span className="label text-ion">{index}</span>}{eyebrow&&<span className="label">{eyebrow}</span>}</div>}{children}</div></section>}
