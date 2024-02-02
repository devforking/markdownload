var turndownPluginTorchlight = (function (exports) {
    'use strict';
    function torchlightSyntaxHighlight(turndownService) {
        turndownService.addRule('torchlightSyntaxHighlight', {
            filter: function (node) {
                return (
                    node.nodeName === 'PRE' && 
                    node.querySelector('code.torchlight')
                );
            },
            replacement: function (content, node) {
                var lang = node.querySelector('code.torchlight').getAttribute('data-lang');
                var code = node.querySelector('code.torchlight').innerText;

                return '```' + lang + '\n' + code + '\n```';
            }
        });
    }

    function torchlight(turndownService) {
      console.log('hello world from turndown-plugin-torchlight')
        turndownService.use([
            torchlightSyntaxHighlight
        ]);
    }

    exports.torchlight = torchlight;
    exports.torchlightSyntaxHighlight = torchlightSyntaxHighlight;

    return exports;

}({}));
