// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'

import sharp from 'sharp' // sharp-import
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'
import { mcpPlugin } from '@payloadcms/plugin-mcp'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'
import { z } from 'zod'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  collections: [Pages, Posts, Media, Categories, Users],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  plugins: [
    ...plugins,
    mcpPlugin({
      overrideApiKeyCollection: (collection) => {
        collection.fields.push({
          name: 'department',
          type: 'select',
          options: ['development', 'marketing'],
        })
        return collection
      },
      mcp: {
        handlerOptions: {
          basePath: '/cms',
          verboseLogs: true,
          maxDuration: 60,
        },
        resources: [
          {
            name: 'readme',
            description: 'This resource is the documentation of Payload',
            mimeType: 'text/markdown',
            title: 'ReadMe',
            uri: 'file:///mcp-server/README.md',
            handler: (uri) => ({
              contents: [
                {
                  uri: uri.href,
                },
              ],
            }),
          },
        ],
        tools: [
          {
            name: 'giveMeANumber',
            description: 'Give a random number between 1 and a number I set. (up to 100)',
            handler: (args: Record<string, unknown>) => {
              const number = (args.numbers as number) || 50
              const result = Math.floor(Math.random() * number) + 1
              return Promise.resolve({
                content: [
                  {
                    type: 'text' as const,
                    text: `# Number guess result \n\n**Number**: ${result}`,
                  },
                ],
              })
            },
            parameters: z.object({
              numbers: z
                .number()
                .int()
                .min(1)
                .max(100)
                .optional()
                .default(50)
                .describe('Number to guess.'),
            }).shape,
          },
        ],
        prompts: [
          {
            name: 'echo',
            argsSchema: { message: z.string() },
            description: 'Creates a prompt to process a message',
            title: 'Echo Prompt',
            handler: ({ message }: { message: string }) => ({
              messages: [
                {
                  content: {
                    type: 'text',
                    text: `Please process this message: ${message}`,
                  },
                  role: 'user',
                },
              ],
            }),
          },
          {
            name: 'summarizePost',
            argsSchema: { message: z.string() },
            description: 'Creates a prompt to summarize the specified post',
            title: 'Summarize Post',
            handler: ({ message }: { message: string }) => ({
              messages: [
                {
                  content: {
                    text: `Please summarize this post: ${message}`,
                    type: 'text',
                  },
                  role: 'assistant',
                },
              ],
            }),
          },
        ],
        serverOptions: {
          serverInfo: {
            name: 'Test MCP Server',
            version: '0.0.1',
          },
        },
      },
      collections: {
        posts: {
          enabled: true,
          description:
            'This posts collection contains a variety of blogs on different topics about web development.',
        },
        pages: {
          enabled: {
            find: true,
            create: false,
            update: false,
            delete: false,
          },
          description:
            'The pages collection is where I house all of my business\'s data like the "about me" and "home" pages',
        },
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${process.env.CRON_SECRET}`
      },
    },
    tasks: [],
  },
})
