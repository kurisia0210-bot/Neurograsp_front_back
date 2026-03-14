# NeuroWeb 项目结构

## 概览

这是一个 monorepo 项目,使用 npm workspaces 管理多个游戏应用和共享资源。

## 目录结构

```
neuroweb/
├── apps/                       # 应用目录
│   ├── game1/                 # 游戏1 (原 adl-web)
│   │   ├── src/               # 源代码
│   │   ├── public/            # 静态资源
│   │   ├── package.json       # 依赖配置
│   │   ├── vite.config.js     # Vite 配置
│   │   └── ...
│   └── game2/                 # 游戏2
│       ├── src/
│       ├── public/
│       └── ...
│
├── packages/                   # 共享包
│   ├── shared-ui/             # 共享 UI 组件
│   │   ├── src/
│   │   │   ├── index.js       # 导出入口
│   │   │   └── components/    # 组件目录
│   │   └── package.json
│   │
│   └── shared-assets/         # 共享资源素材
│       ├── images/            # 图片
│       ├── icons/             # 图标
│       ├── sounds/            # 音效
│       └── package.json
│
├── configs/                    # 共享配置
│   ├── vite/
│   │   └── react-base.js      # Vite 基础配置
│   ├── eslint/
│   │   └── react-vite-base.mjs # ESLint 规则
│   └── tailwind/
│       └── base.js            # Tailwind 配置
│
├── adl-backend/               # 后端服务
├── assets_raw/                # 原始资源
└── package.json               # 根 workspace 配置
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发

启动 Game1:
```bash
npm run dev:game1
```

启动 Game2:
```bash
npm run dev:game2
```

同时启动所有游戏:
```bash
npm run dev:all
```

### 构建

构建 Game1:
```bash
npm run build:game1
```

构建 Game2:
```bash
npm run build:game2
```

构建所有游戏:
```bash
npm run build:all
```

## 共享资源使用

### 使用共享 UI 组件

```jsx
import { Button } from '@neuroweb/shared-ui'

function MyComponent() {
  return <Button>点击我</Button>
}
```

### 使用共享资源

```jsx
import logo from '@neuroweb/shared-assets/images/logo.png'

function Header() {
  return <img src={logo} alt="Logo" />
}
```

## 配置文件

每个游戏应用都引用了共享的配置文件:

- **Vite**: `configs/vite/react-base.js`
- **ESLint**: `configs/eslint/react-vite-base.mjs`
- **Tailwind**: `configs/tailwind/base.js`

应用可以在自己的配置文件中扩展这些基础配置。

## 添加新游戏

1. 在 `apps/` 目录下创建新游戏目录
2. 复制 `game2` 的结构作为模板
3. 在根 `package.json` 中添加相应的 scripts
4. 运行 `npm install` 安装依赖

## 端口分配

- Game1: `http://localhost:5173`
- Game2: `http://localhost:5174`
- 后续游戏依次递增端口号
