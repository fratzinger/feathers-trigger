export default {
  title: 'feathers-trigger',
  description: 'Add triggers and actions to your feathers app.',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    repo: 'fratzinger/feathers-trigger',
    logo: '/img/logo.svg',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Edit this page on GitHub',
    contributors: false,
    lastUpdated: true,
    sidebarDepth: 1,
    sidebar: [
      '/getting-started',
      '/hooks'
    ],
    navbar: [
      {
        text: 'Ecosystem',
        children: [
          { 
            text: 'www.feathersjs.com', 
            link: 'https://feathersjs.com/' 
          }, {
            text: "Feathers Github Repo",
            link: "https://github.com/feathersjs/feathers"
          }, {
            text: 'Awesome Feathersjs',
            link: 'https://github.com/feathersjs/awesome-feathersjs'
          }
        ]
      }
    ]
  }
}