/**
 * 共享的 Tailwind CSS 基础配置
 */
export const sharedTailwindConfig = {
  theme: {
    extend: {
      colors: {
        // 可以在这里添加共享的颜色主题
      },
      fontFamily: {
        // 共享的字体配置
      }
    }
  },
  plugins: []
}

/**
 * 创建 Tailwind 配置
 * @param {string[]} contentPaths - 内容路径
 * @param {object} themeExtension - 主题扩展
 */
export function createTailwindConfig(contentPaths = [], themeExtension = {}) {
  return {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
      ...contentPaths
    ],
    theme: {
      extend: {
        ...sharedTailwindConfig.theme.extend,
        ...themeExtension
      }
    },
    plugins: sharedTailwindConfig.plugins
  }
}
