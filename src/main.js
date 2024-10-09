import { Plugin, PluginSettingTab, Setting, Platform } from "obsidian";
import { matchUrl, replaceUrl } from "./utils.js"

let rules = [
    ["https://github.com/.*", "https://mirror.ghproxy.com/$0"],
    ["https://raw.githubusercontent.com/.*", "https://mirror.ghproxy.com/$0"],
    ["https://huggingface.co/(.*)", "https://hf-mirror.com/$1"]
]

function isMobile() {
    return window.obsidian && window.obsidian.isMobile === true;
}

// 代理访问
function proxy(e) {
    return new Promise((function (t, n) {
        e.success = t;
        e.error = function (e, t) {
            return n(t)
        }
        
        if (isMobile()) {
            return forMobile(e);
        } else {
            return forPC(e)
        }
    }))
}

/**
 *
 * https://github.com/denolehov/obsidian-git/issues/57
 * https://capacitorjs.com/blog/bypassing-cors-with-the-http-plugin
 * https://github.com/capacitor-community/http
 *
 * @param {*} e
 */
async function forMobile(e) {
    try {
        const { http } = await import('@capacitor-community/http');
        const options = {url: e.url};
        new window.Notice("发送请求：" + e.url, 10000)
        new window.Notice(JSON.stringify(http.get) + "123", 10000)
        // http.get(options);
        const resp = await http.get(options).then((resp) => {
            new window.Notice("请求成功：", 10000)
            new window.Notice("请求成功：" + resp.status, 10000)
            e.success(resp.data)
        }).catch((error) => {
            new window.Notice("出错了：" + JSON.stringify(error), 10000)
        })
        new window.Notice("请求成功12", 10000)
        e.success(resp.data)

    } catch (e) {
        e.error(e)
        new window.Notice("加载@capacitor-community/http出错", 10000)
    }
}

async function forPC(e) {
    try {
        const https = await import('https');
        https.get(e.url, function (res) {
            new window.Notice("https.get成功", 10000)
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                try {
                    new window.Notice("https.get处理数据成功", 10000)
                    e.success(rawData)
                } catch (e) {
                    new window.Notice("https.get处理数据失败", 10000)
                    e.error(e)
                }
            });

        }).on('error', function (e) {
            new window.Notice("https.get失败", 10000)
            e.error(e)
        })
    } catch (e) {
        new window.Notice("导入http出错", 10000)
        new window.Notice(JSON.parse(e), 10000)
    }
}
class ApProxy {
    constructor() {
        this.ap = null;
    }

    /**
     * 
     * @param {ProxyGithub} plugin 
     */
    regedit(plugin) {
        this.ap = window.ajaxPromise;
        window.ajaxPromise = function (e) {
            console.log("hook ajaxPromise send")
            if (!plugin.matchAndReplaceUrl(e)) {
                return this.ap(e);
            }
            return proxy(e)
        }.bind(this);
    }

    unRegedit() {
        window.ajaxPromise = this.ap;
    }
}

//window.Capacitor.registerPlugin("App").request
 class ApCapacitor {
    constructor() {
        this.ap = null;
    }

    /**
     * 
     * @param {ProxyGithub} plugin 
     */
    regedit(plugin) {
        this.ap = window.Capacitor.registerPlugin("App").request;
        window.Capacitor.registerPlugin("App").request = function (e) {
            console.log("hook App send");
            plugin.matchAndReplaceUrl(e);
            this.ap(e);
        }.bind(this);
        console.log("apc注册成功");
    }

    unRegedit() {
        window.Capacitor.registerPlugin("App").request = this.ap;
    }
}

class ApElectron {
    constructor() {
        this.ap = null;
    }

    /**
     * 
     * @param {ProxyGithub} plugin 
     */
    regedit(plugin) {
        this.ap = window.require("electron").ipcRenderer.send;
        window.require("electron").ipcRenderer.send = function (a, b, e, ...rest) {
            console.log("hook electron send");
            plugin.matchAndReplaceUrl(e);
            this.ap(a, b, e, ...rest);
        }.bind(this);
        console.log("ApElectron注册成功");
    }

    unRegedit() {
        window.require("electron").ipcRenderer.send = this.ap;
    }
}

class ApIframeFetch {
    constructor() {
        this.ap = null;
        this.observer = null;
        this.node = null;
    }

    /**
     * 
     * @param {ProxyGithub} plugin 
     */
    regedit(plugin) {
        const hookFetch = (node) => {
            this.node = node;
            this.ap = node.contentWindow.fetch.bind(node.contentWindow);
            node.contentWindow.fetch = (input, init) => {
                console.log("hook iframe fetch");
                if (typeof input === 'string') {
                    input = { url: input }
                    plugin.matchAndReplaceUrl(input);
                    return this.ap(input.url, init);
                } else {
                    plugin.matchAndReplaceUrl(input);
                    return this.ap(input, init);
                }
            };
        };

        const iframe = document.querySelector('iframe[id^="smart_embed"]');
        if (iframe) {
            console.log("find iframe sync", iframe)
            hookFetch(iframe);
        } else {
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.id && node.id.startsWith('smart_embed')) {
                            console.log("find iframe async", node)
                            hookFetch(node);
                        }
                    });
                });
            });

            this.observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    unRegedit() {
        if (this.observer) { this.observer.disconnect(); }
        if (this.node) { this.node.contentWindow.fetch = this.ap }
    }
}

class ApFetch {
    constructor() {
        this.ap = null;
    }

    /**
     * 
     * @param {ProxyGithub} plugin 
     */
    regedit(plugin) {
        this.ap = window.fetch;
        window.fetch = (input, init) => {
            console.log("hook window fetch");
            if (typeof input === 'string') {
                const context = { url: input }
                plugin.matchAndReplaceUrl(context);
                return this.ap(context.url, init);
            } else {
                const context = { url: input.url }
                plugin.matchAndReplaceUrl(input);
                return this.ap({ ...input, ...context }, init);
            }
        };
    }

    unRegedit() {
        window.fetch = this.ap
    }
}

class ProxyGithubSettingTab extends PluginSettingTab {

    constructor(app, plugin) {
        super(app, plugin)
        this.plugin = plugin
    }
    async display() {
        this.containerEl.empty();
        new Setting(this.containerEl)
            .setName('代理规则')
            .setDesc('通过编辑规则来切换代理，每行一个规则，格式为：匹配URL,替换URL')
            .addTextArea((textArea) => {
                textArea.inputEl.setAttr('rows', 10);
                textArea.inputEl.setAttr('cols', 80);
                textArea
                    .setPlaceholder('匹配URL,替换URL')
                    .setValue(this.plugin.settings.rules.map(rule => rule.join(',')).join('\n'));
                textArea.inputEl.onblur = (e) => {
                    const patterns = e.target.value;
                    this.plugin.settings.rules = patterns.split('\n').map(line => line.split(','));
                    this.plugin.saveSettings();
                };
            });
    }
}

export default class ProxyGithub extends Plugin {
    constructor(app, manifest) {
        super(app, manifest);
        this.proxyGithub = new ProxyGithubInstance(this);
    }

    onload() {
        new window.Notice("添加 ProxyGithub 代理访问社区插件！");
        this.addSettingTab(new ProxyGithubSettingTab(this.app, this));
        this.proxyGithub.regedit();
        this.settings = { rules }
    }
    async loadSettings() {
		this.settings = Object.assign({}, { rules }, await this.loadData());
	}
    async saveSettings() {
        await this.saveData(this.settings);
	}

    // 匹配URL
    matchAndReplaceUrl(e) {
        for (let [match, replace] of this.settings.rules) {
            if (e && e.url) {
                let matches = matchUrl(match, e.url);
                if (matches) {
                    console.log("替换前的地址: %s", e.url);
                    e.url = replaceUrl(matches, replace);
                    console.log("替换后的地址: %s", e.url);
                    return true;
                }
            }
        }
        return false;
    }

    onunload() {
        this.proxyGithub.unRegedit();
    }
}

class ProxyGithubInstance {
    constructor(plugin) {
        this.plugin = plugin;
        this.hooksList = [
            // new ApProxy(),
            // new ApCapacitor(),
            new ApElectron(),
            // new ApFetch(),
            new ApIframeFetch()
        ];
    }

    regedit() {
        this.hooksList.forEach(hook => hook.regedit(this.plugin));
    }

    unRegedit() {
        this.hooksList.forEach(hook => hook.unRegedit());
    }
}

