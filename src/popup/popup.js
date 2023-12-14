//function to send the download message to the background page
function sendDownloadMessage(text) {
    if (text != null) {

        return browser.tabs.query({
            currentWindow: true,
            active: true
        }).then(tabs => {
            var message = {
                type: "download",
                markdown: text,
                title: document.getElementById("title").value,
                tab: tabs[0],
                imageList: imageList,
                mdClipsFolder: mdClipsFolder
            };
            return browser.runtime.sendMessage(message);
        });
    }
}

//function that handles messages from the injected script into the site
function notify(message) {
    // message for displaying markdown
    if (message.type == "display.md") {

        // set the values from the message
        //document.getElementById("md").value = message.markdown;
        cm.setValue(message.markdown);
        document.getElementById("title").value = message.article.title;
        imageList = message.imageList;
        mdClipsFolder = message.mdClipsFolder;
        
        // show the hidden elements
        document.getElementById("container").style.display = 'flex';
        document.getElementById("spinner").style.display = 'none';
         // focus the download button
        document.getElementById("download").focus();
        cm.refresh();
    }
}

// ----------------------------------------------------------------

// event handler for download button
async function download(e) {
  e.preventDefault();
  await sendDownloadMessage(cm.getValue());
  window.close();
}

// event handler for download selected button
async function downloadSelection(e) {
  e.preventDefault();
  if (cm.somethingSelected()) {
    await sendDownloadMessage(cm.getSelection());
  }
}

// ----------------------------------------------------------------

// all the stuff that should happen when the popup is loaded (i.e. the button is clicked)
const init = async () => {
  // listen for notifications from the background page (still necessary??)
  browser.runtime.onMessage.addListener(notify)

  // set up CodeMirror
  const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
  const cm = CodeMirror.fromTextArea(document.getElementById("md"), {
    theme: darkMode ? "xq-dark" : "xq-light",
    mode: "markdown",
    lineWrapping: true
  })
  cm.on("cursorActivity", (cm) => {
    const somethingSelected = cm.somethingSelected()
    var a = document.getElementById("downloadSelection")

    if (somethingSelected && a.style.display != "block") a.style.display = "block"
    else if(!somethingSelected && a.style.display != "none") a.style.display = "none"
  })

  // get and check the options
  const options = await getOptions()
  checkInitialSettings(options)
  
  // add event listeners for the buttons
  document.getElementById("download").addEventListener("click", download)
  document.getElementById("downloadSelection").addEventListener("click", downloadSelection)
  document.getElementById("selected").addEventListener("click", (e) => {
    e.preventDefault()
    toggleClipSelection(options)
  })
  document.getElementById("document").addEventListener("click", (e) => {
    e.preventDefault()
    toggleClipSelection(options)
  })
  document.getElementById("includeTemplate").addEventListener("click", (e) => {
    e.preventDefault()
    toggleIncludeTemplate(options)
  })
  document.getElementById("downloadImages").addEventListener("click", (e) => {
    e.preventDefault()
    toggleDownloadImages(options)
  })

  await clipSite(cm, options)
}

// the function that does the majority of the heavy lifting
const clipSite = async (cm, options) => {
  // get the html content of the current tab
  const tabs = await browser.tabs.query({ currentWindow: true, active: true })
  var id = tabs[0].id;
  var url = tabs[0].url;
  const contentResult = await browser.scripting.executeScript({ 
    target: { tabId: id, allFrames: true },
    files: ["/contentScript/pageContext.js", "/contentScript/getSelectionAndDom.js"]
  })
  console.log(contentResult)

  // make sure we actually get results
  if(!contentResult || contentResult.length === 0 || !contentResult[0]){
    return showError("Unable to get html from content script")
  }

  // if we have a selection, show the slection option
  showOrHideClipOption(contentResult[0].result.selection)

  // use Readability to trim down the article and extract metadata
  const article = await getArticleFromDom(contentResult[0].result.dom)
  console.log(article)

  // convert the article to markdown
  const { markdown, imageList } = await convertArticleToMarkdown(article)

  // format the title
  article.title = await formatTitle(article)

  // format the mdClipsFolder
  const mdClipsFolder = await formatMdClipsFolder(article)

  // set the values from the message
  //document.getElementById("md").value = message.markdown;
  cm.setValue(markdown);
  document.getElementById("title").value = article.title
  
  // show the hidden elements
  document.getElementById("container").style.display = 'flex'
  document.getElementById("spinner").style.display = 'none'
    // focus the download button
  document.getElementById("download").focus()
  cm.refresh()
}

// ----------------------------------------------------------------

function showError(err) {
  console.error(err)
  // show the hidden elements
  document.getElementById("container").style.display = 'flex'
  document.getElementById("spinner").style.display = 'none'
  cm.setValue(`Error clipping the page\n\n${err}`)
}

// check the checkboxes that need to be checked
const checkInitialSettings = options => {
  if (options.includeTemplate)
    document.querySelector("#includeTemplate").classList.add("checked")

  if (options.downloadImages)
    document.querySelector("#downloadImages").classList.add("checked")

  if (options.clipSelection)
    document.querySelector("#selected").classList.add("checked")
  else
    document.querySelector("#document").classList.add("checked")
}

const toggleClipSelection = options => {
  options.clipSelection = !options.clipSelection
  document.querySelector("#selected").classList.toggle("checked")
  document.querySelector("#document").classList.toggle("checked")
  browser.storage.sync.set(options).then(() => clipSite()).catch((error) => console.error(error))
}

const toggleIncludeTemplate = options => {
  options.includeTemplate = !options.includeTemplate
  document.querySelector("#includeTemplate").classList.toggle("checked")
  browser.storage.sync.set(options).then(() => {
    browser.contextMenus.update("toggle-includeTemplate", { checked: options.includeTemplate })
    try {
      browser.contextMenus.update("tabtoggle-includeTemplate", { checked: options.includeTemplate })
    } catch { }
    return clipSite()
  }).catch((error) => console.error(error))
}

const toggleDownloadImages = options => {
  options.downloadImages = !options.downloadImages
  document.querySelector("#downloadImages").classList.toggle("checked")
  browser.storage.sync.set(options).then(() => {
    browser.contextMenus.update("toggle-downloadImages", { checked: options.downloadImages })
    try {
      browser.contextMenus.update("tabtoggle-downloadImages", { checked: options.downloadImages })
    } catch { }
  }).catch((error) => console.error(error))
}

const showOrHideClipOption = selection => {
  if (selection) document.getElementById("clipOption").style.display = "flex"
  else document.getElementById("clipOption").style.display = "none"
}

// --- Now that everything is defined, run the init function --- //
init()
