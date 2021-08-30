module.exports = {
  title: 'feathers-notify',
  description: '',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    repo: 'fratzinger/feathers-notify',
    logo: '/img/logo.svg',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Edit this page on GitHub',
    lastUpdated: true,
    sidebarDepth: 1,
    sidebar: {
      '/': [
        { text: 'Getting Started', link: '/getting-started' },
        { text: "Hooks", link: '/hooks' }
      ]
    }
  }
  }