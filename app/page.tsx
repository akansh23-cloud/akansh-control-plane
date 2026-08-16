import ModeView from '@/components/providers/ModeView';
import RecruiterView from '@/components/recruiter/RecruiterView';
import Hero from '@/components/sections/Hero';
import Identity from '@/components/sections/Identity';
import Pipeline from '@/components/sections/Pipeline';
import Experience from '@/components/sections/Experience';
import Evolution from '@/components/sections/Evolution';
import RunARelease from '@/components/sections/RunARelease';
import Projects from '@/components/sections/Projects';
import Infrastructure from '@/components/sections/Infrastructure';
import DevSecOps from '@/components/sections/DevSecOps';
import Observability from '@/components/sections/Observability';
import Credentials from '@/components/sections/Credentials';
import Contact from '@/components/sections/Contact';
import BuildStatus from '@/components/sections/BuildStatus';

export default function Home() {
  return (
    <ModeView recruiter={<RecruiterView />} engineer={<><Hero /><Identity /><Pipeline /><Experience /><Evolution /><RunARelease /><Projects /><Infrastructure /><DevSecOps /><Observability /><Credentials /><Contact /><BuildStatus /></>} />
  );
}
