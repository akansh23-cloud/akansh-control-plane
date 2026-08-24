/**
 * Verified profile content. Do not add claims here that are not on the resume.
 */
export const profile = {
  name: 'Akansh Mowar',
  role: 'DevOps / Platform / Cloud Engineer',
  email: 'mowar23akansh@gmail.com',
  github: 'https://github.com/akansh23-cloud',
  linkedin: 'https://www.linkedin.com/in/akansh-mowar/',
  resume: 'https://raw.githubusercontent.com/akansh23-cloud/akansh-control-plane/main/public/Akansh_Mowar_DevOps_Platform_Engineer_Resume.pdf',
  summary:
    'Builds and operates cloud-native delivery systems that help engineering teams ship software reliably, securely and repeatedly.',
  standfirst:
    'Sixty years of people learning how to ship. The last stretch is mine.',
  experience: [
    {
      company: 'Barclays',
      title: 'DevOps Engineer',
      period: 'Jul 2023 — Present',
      points: [
        'Enterprise release engineering across a 50+ microservice banking platform.',
        'CI/CD automation with GitLab CI/CD and Jenkins across build, verification and deployment workflows.',
        'Kubernetes and Red Hat OpenShift operations with Helm-based release configuration.',
        'DevSecOps controls integrating SonarQube, Veracode, Trivy and HashiCorp Vault.',
        'Modernization, observability and production-readiness work across cloud-native services.',
      ],
    },
  ],
  stack: [
    'Kubernetes', 'OpenShift', 'GitLab CI/CD', 'Jenkins', 'Docker', 'Helm', 'AWS', 'Azure',
    'Linux', 'Git', 'SonarQube', 'Veracode', 'Trivy', 'HashiCorp Vault', 'ELK',
  ],
  certifications: [
    'Microsoft Azure Administrator — AZ-104',
    'Microsoft Azure Fundamentals — AZ-900',
    'AWS Cloud Practitioner',
  ],
  systems: [
    {
      name: 'Enterprise Release Engineering',
      type: 'Professional system',
      era: 'Stations 09 — 11',
      description:
        'Release automation, cluster delivery, security gates and production readiness for a large enterprise microservice estate.',
    },
    {
      name: 'Migration Assurance Platform',
      type: 'Engineering project',
      era: 'Station 11',
      description:
        'A cloud-native assurance platform using AWS EKS/ECR, Terraform, Argo CD, GitLab CI/CD and GitOps patterns.',
    },
    {
      name: 'Career Autopilot',
      type: 'Personal platform',
      era: 'Station 12',
      description:
        'A full-stack career platform with service decomposition, cloud deployment and platform-oriented engineering concerns.',
    },
  ],
};
