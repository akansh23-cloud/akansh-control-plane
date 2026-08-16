import type { Metadata } from 'next';
import Link from 'next/link';
import { profile, education, certifications } from '@/data/profile';
import { roles } from '@/data/experience';
import { projects } from '@/data/projects';

export const metadata: Metadata = {
  title: 'Resume',
  description: 'Resume of Akansh Mowar — DevOps Engineer in Pune working across OpenShift, GitLab CI/CD, Helm, AWS and Terraform.',
};

export default function ResumePage() {
  return (
    <div className="shell py-32" style={{ ['--max' as string]: '52rem' }}>
      <p className="label text-ion">Resume</p>
      <h1 className="display-lg mt-4">{profile.name}</h1>
      <p className="mono-sm mt-3 text-mist">{profile.title} <span className="text-line">·</span> {profile.location}</p>
      <div className="mt-8 flex flex-wrap gap-3"><a href={profile.resume} className="btn btn-primary" download>Download PDF</a><Link href="/" className="btn">Back to the control plane</Link></div>
      <p className="lede mt-10">{profile.summary}</p>
      <section className="mt-14"><h2 className="label text-ion">Experience</h2>{roles.map((role) => <article key={role.id} className="mt-8 border-t border-line pt-6"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-display text-2xl tracking-tight">{role.company} — {role.role}</h3><p className="mono-sm text-mist">{role.period}</p></div><p className="mono-sm mt-1 text-mist">{role.location}</p>{role.groups.map((group) => <ul key={group.title} className="mt-4 space-y-2">{group.items.map((item) => <li key={item} className="flex gap-3 text-sm leading-relaxed text-mist"><span className="mt-2 h-px w-3 shrink-0 bg-line" aria-hidden="true" /><span>{item}</span></li>)}</ul>)}</article>)}</section>
      <section className="mt-14"><h2 className="label text-ion">Projects</h2>{projects.map((project) => <article key={project.id} className="mt-8 border-t border-line pt-6"><h3 className="font-display text-2xl tracking-tight">{project.title}</h3><p className="mono-sm mt-1 text-mist">{project.stack.join(' · ')}</p><ul className="mt-4 space-y-2">{project.approach.map((item) => <li key={item} className="flex gap-3 text-sm leading-relaxed text-mist"><span className="mt-2 h-px w-3 shrink-0 bg-line" aria-hidden="true" /><span>{item}</span></li>)}</ul></article>)}</section>
      <section className="mt-14 grid gap-10 sm:grid-cols-2"><div><h2 className="label text-ion">Education</h2><p className="mt-4 font-display text-xl tracking-tight">{education.school}</p><p className="mono-sm mt-2 text-mist">{education.degree}</p><p className="mono-sm text-mist">{education.specialisation}</p><p className="mono-sm mt-2 text-mist">{education.period}</p></div><div><h2 className="label text-ion">Certifications</h2><ul className="mt-4 space-y-2">{certifications.map((cert) => <li key={cert.code} className="mono-sm text-mist">{cert.name} <span className="text-line">·</span> {cert.code}</li>)}</ul></div></section>
      <section className="mt-14 border-t border-line pt-6"><h2 className="label text-ion">Contact</h2><ul className="mt-4 space-y-2"><li className="mono-sm text-mist">{profile.email}</li><li className="mono-sm text-mist">{profile.linkedin}</li><li className="mono-sm text-mist">{profile.github}</li></ul></section>
    </div>
  );
}
