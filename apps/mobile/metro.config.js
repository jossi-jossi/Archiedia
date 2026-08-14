// 모노레포 구성: apps/mobile 밖에 있는 packages/schema를 Metro가 지켜보고 해석할 수 있게
// 저장소 루트를 watchFolders와 nodeModulesPaths에 추가한다.
const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
]
// 루트로 거슬러 올라가며 아무 node_modules나 집어오지 않도록 막는다. (중복 react 방지)
config.resolver.disableHierarchicalLookup = true

module.exports = config
