try {
  if(typeof importScripts !== 'undefined') importScripts('/shared/lib/browser-polyfill.js', '/shared/options.js', '/shared/context-menus.js')
} catch (e) {
  console.error(e)
}

createMenus()

browser.contextMenus.onClicked.addListener(menuListener)