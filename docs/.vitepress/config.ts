import { defineConfig } from 'vitepress'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  title: 'feathers-trigger',
  description: 'Add triggers and actions to your feathers app.',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    logo: '/img/logo.svg',
    editLink: {
      pattern:
        'https://github.com/fratzinger/feathers-trigger/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    lastUpdatedText: 'Last Updated',
    socialLinks: [
      {
        icon: 'twitter',
        link: 'https://twitter.com/feathersjs',
      },
      {
        icon: 'discord',
        link: 'https://discord.gg/qa8kez8QBx',
      },
      {
        icon: 'github',
        link: 'https://github.com/fratzinger/feathers-trigger',
      },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        link: '/getting-started',
        // items: [
        //   { text: "Getting Started", link: "/getting-started" },
        //   { text: "Hooks", link: "/hooks" },
        // ]
      },
      {
        text: 'Hooks',
        link: '/hooks',
      },
    ],
    nav: [
      {
        text: 'Ecosystem',
        items: [
          {
            text: 'www.feathersjs.com',
            link: 'https://feathersjs.com/',
          },
          {
            text: 'Feathers Github Repo',
            link: 'https://github.com/feathersjs/feathers',
          },
          {
            text: 'Awesome Feathersjs',
            link: 'https://github.com/feathersjs/awesome-feathersjs',
          },
        ],
      },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2021-present Frederik Schmatz',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
