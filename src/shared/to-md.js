
// function to convert an article info object into markdown
async function convertArticleToMarkdown(article, downloadImages = null) {
  const options = await getOptions();
  if (downloadImages != null) {
    options.downloadImages = downloadImages;
  }

  // substitute front and backmatter templates if necessary
  if (options.includeTemplate) {
    options.frontmatter = textReplace(options.frontmatter, article) + '\n';
    options.backmatter = '\n' + textReplace(options.backmatter, article);
  }
  else {
    options.frontmatter = options.backmatter = '';
  }

  options.imagePrefix = textReplace(options.imagePrefix, article, options.disallowedChars)
    .split('/').map(s=>generateValidFileName(s, options.disallowedChars)).join('/');

  let result = turndown(article.content, options, article);
  if (options.downloadImages /*&& options.downloadMode == 'downloadsApi'*/) {
    // pre-download the images
    result = await preDownloadImages(result.imageList, result.markdown);
  }
  return result;
}


async function preDownloadImages(imageList, markdown) {
  const options = await getOptions();
  let newImageList = {};
  // originally, I was downloading the markdown file first, then all the images
  // however, in some cases we need to download images *first* so we can get the
  // proper file extension to put into the markdown.
  // so... here we are waiting for all the downloads and replacements to complete
  await Promise.all(Object.entries(imageList).map(([src, filename]) => new Promise((resolve, reject) => {
        // we're doing an xhr so we can get it as a blob and determine filetype
        // before the final save
        const xhr = new XMLHttpRequest();
        xhr.open('GET', src);
        xhr.responseType = "blob";
        xhr.onload = async function () {
          // here's the returned blob
          const blob = xhr.response;

          if (options.imageStyle == 'base64') {
            var reader = new FileReader();
            reader.onloadend = function () {
              markdown = markdown.replaceAll(src, reader.result)
              resolve()
            }
            reader.readAsDataURL(blob);
          }
          else {

            let newFilename = filename;
            if (newFilename.endsWith('.idunno')) {
              // replace any unknown extension with a lookup based on mime type
              newFilename = filename.replace('.idunno', '.' + mimedb[blob.type]);

              // and replace any instances of this in the markdown
              // remember to url encode for replacement if it's not an obsidian link
              if (!options.imageStyle.startsWith("obsidian")) {
                markdown = markdown.replaceAll(filename.split('/').map(s => encodeURI(s)).join('/'), newFilename.split('/').map(s => encodeURI(s)).join('/'))
              }
              else {
                markdown = markdown.replaceAll(filename, newFilename)
              }
            }

            // create an object url for the blob (no point fetching it twice)
            const blobUrl = URL.createObjectURL(blob);

            // add this blob into the new image list
            newImageList[blobUrl] = newFilename;

            // resolve this promise now
            // (the file might not be saved yet, but the blob is and replacements are complete)
            resolve();
          }
        };
        xhr.onerror = function () {
          reject('A network error occurred attempting to download ' + src);
        };
        xhr.send();
  })));

  return { imageList: newImageList, markdown: markdown };
}