import { existsSync } from 'node:fs'

// Route groups by JS cost: read-only routes live directly in app/(app)/; routes that
// need client state/cache (Zustand, TanStack Query) live in app/(app)/(interactive)/.
const ROUTE_GROUPS = {
  read: 'app/(app)',
  interactive: 'app/(app)/(interactive)',
}

/** @param {import('plop').NodePlopAPI} plop */
export default function (plop) {
  // Helpers
  plop.setHelper('upperFirst', (str) => str.charAt(0).toUpperCase() + str.slice(1))

  // ─── Entity ─────────────────────────────────────────────────────────────────
  plop.setGenerator('entity', {
    description: 'Create a new FSD entity slice',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Entity name (singular, kebab-case, e.g. product):',
        validate: (v) => /^[a-z][a-z0-9-]*$/.test(v) || 'Use kebab-case (e.g. product)',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/entities/{{name}}/model/types.ts',
        templateFile: 'plop-templates/entity/model/types.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/entities/{{name}}/api/get-{{name}}s.ts',
        templateFile: 'plop-templates/entity/api/get-items.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/entities/{{name}}/ui/{{pascalCase name}}Card.tsx',
        templateFile: 'plop-templates/entity/ui/Card.tsx.hbs',
      },
      {
        type: 'add',
        path: 'src/entities/{{name}}/index.ts',
        templateFile: 'plop-templates/entity/index.ts.hbs',
      },
    ],
  })

  // ─── Feature ─────────────────────────────────────────────────────────────────
  plop.setGenerator('feature', {
    description: 'Create a new FSD feature slice',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Feature name (kebab-case, e.g. add-to-cart):',
        validate: (v) => /^[a-z][a-z0-9-]*$/.test(v) || 'Use kebab-case (e.g. add-to-cart)',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/features/{{name}}/ui/{{pascalCase name}}Form.tsx',
        templateFile: 'plop-templates/feature/ui/Form.tsx.hbs',
      },
      {
        type: 'add',
        path: 'src/features/{{name}}/actions/{{name}}-action.ts',
        templateFile: 'plop-templates/feature/actions/action.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/features/{{name}}/index.ts',
        templateFile: 'plop-templates/feature/index.ts.hbs',
      },
    ],
  })

  // ─── Widget ──────────────────────────────────────────────────────────────────
  plop.setGenerator('widget', {
    description: 'Create a new FSD widget slice',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Widget name (kebab-case, e.g. user-sidebar):',
        validate: (v) => /^[a-z][a-z0-9-]*$/.test(v) || 'Use kebab-case (e.g. user-sidebar)',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/widgets/{{name}}/ui/{{pascalCase name}}.tsx',
        templateFile: 'plop-templates/widget/ui/Widget.tsx.hbs',
      },
      {
        type: 'add',
        path: 'src/widgets/{{name}}/index.ts',
        templateFile: 'plop-templates/widget/index.ts.hbs',
      },
    ],
  })

  // ─── Route ───────────────────────────────────────────────────────────────────
  plop.setGenerator('route', {
    description: 'Create an App Router route + its FSD views slice',
    prompts: [
      {
        type: 'input',
        name: 'path',
        message: 'Route path (kebab-case segments, e.g. reports/monthly):',
        validate: (v) => {
          if (!/^[a-z][a-z0-9-]*(\/[a-z][a-z0-9-]*)*$/.test(v)) {
            return 'Use kebab-case segments separated by "/" (e.g. reports/monthly)'
          }
          const taken = Object.values(ROUTE_GROUPS).find((dir) => existsSync(`${dir}/${v}/page.tsx`))
          return taken ? `/${v} already exists in ${taken}/` : true
        },
      },
      {
        type: 'list',
        name: 'group',
        message: 'Route group:',
        choices: [
          { name: 'read — Server Components only, no client providers (default)', value: 'read' },
          {
            name: 'interactive — mounts StoreProvider + QueryProvider (Zustand, TanStack Query)',
            value: 'interactive',
          },
        ],
      },
    ],
    actions: (data) => {
      const slice = data.path.replaceAll('/', '-')
      const segment = data.path.split('/').at(-1)
      Object.assign(data, {
        slice,
        interactive: data.group === 'interactive',
        title: segment
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
      })
      return [
        {
          type: 'add',
          path: `${ROUTE_GROUPS[data.group]}/{{path}}/page.tsx`,
          templateFile: 'plop-templates/route/app/page.tsx.hbs',
        },
        {
          type: 'add',
          path: 'src/views/{{slice}}/ui/{{pascalCase slice}}Page.tsx',
          templateFile: 'plop-templates/route/views/ui/Page.tsx.hbs',
        },
        {
          type: 'add',
          path: 'src/views/{{slice}}/index.ts',
          templateFile: 'plop-templates/route/views/index.ts.hbs',
        },
      ]
    },
  })

  // ─── Adapter ─────────────────────────────────────────────────────────────────
  plop.setGenerator('adapter', {
    description: 'Create a shared/ui adapter wrapping a #ui-kit primitive',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name (PascalCase, e.g. Select):',
        validate: (v) => {
          if (!/^[A-Z][A-Za-z0-9]*$/.test(v)) return 'Use PascalCase (e.g. Select)'
          return existsSync(`src/shared/ui/${v}`) ? `src/shared/ui/${v}/ already exists` : true
        },
      },
      {
        type: 'confirm',
        name: 'interactive',
        message: 'Interactive (needs hooks/event handlers → adds "use client")?',
        default: false,
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/shared/ui/{{name}}/{{name}}.tsx',
        templateFile: 'plop-templates/adapter/Adapter.tsx.hbs',
      },
      {
        type: 'add',
        path: 'src/shared/ui/{{name}}/index.ts',
        templateFile: 'plop-templates/adapter/index.ts.hbs',
      },
      {
        type: 'append',
        path: 'src/shared/ui/index.ts',
        templateFile: 'plop-templates/adapter/barrel-export.ts.hbs',
        separator: '',
      },
      (data) =>
        `Next: export ${data.name} from the kit in src/shared/ui/kit/default/ so '#ui-kit' resolves it.`,
    ],
  })
}
