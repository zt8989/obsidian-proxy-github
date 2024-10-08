import { Plugin, PluginSettingTab, Setting } from "obsidian";

let proMap = {
	ghproxy:{
		home: url => `https://mirror.ghproxy.com/${url}`
		,raw: url => `https://mirror.ghproxy.com/${url}`
	}
}

let matches = {
    "raw": (url) => url.startsWith("https://raw.githubusercontent.com/"),
    "home": (url) => url.startsWith("https://github.com/")
}

function isMobile() {
    return window.obsidian && window.obsidian.isMobile === true;
}

import { matchUrl, replaceUrl } from './utils';

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
        window.fetch = function (url, ...rest) {
            console.log("hook electron send");
            plugin.matchAndReplaceUrl({ url });
            this.ap(url, ...rest);
        }.bind(this);
        console.log("ApFetch注册成功");
    }

    unRegedit() {
        window.require("electron").ipcRenderer.send = this.ap;
    }
}

class ProxyGithubSettingTab extends PluginSettingTab {

    constructor(app, plugin) {
        super(app, plugin)
        this.plugin = plugin
    }
    async display() {
        this.containerEl.empty()
        new Setting(this.containerEl)
            .setName('代理服务器')
            .setDesc(`通过选择不同的服务器来切换代理，可以解决某些情况下，某个服务器无法访问的情况。当前代理服务器：${this.plugin.settings.server}`)
            // .setValue(this.plugin.settings.server) // <-- Add me!
            .addDropdown(dropDown => {
                // dropDown.addOption('fastgit', 'fastgit');
                // dropDown.addOption('mtr', 'mtr');
                dropDown.addOption('ghproxy', 'ghproxy');
                // dropDown.addOption('gitclone', 'gitclone');
                // dropDown.addOption('mirr', 'mirr');
                dropDown.setValue(this.plugin.settings.server)
                dropDown.onChange(async (value) =>	{
                    this.plugin.settings.server=value
                    // this.plugin.settings.server = value;
                    await this.plugin.saveSettings();
                });
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
        this.settings = {server:'ghproxy'}
    }
    async loadSettings() {
		this.settings = Object.assign({}, {server:'ghproxy'}, await this.loadData());
	}
    async saveSettings() {
        await this.saveData(this.settings);
		server = this.settings.server;
		
	}

    // 匹配URL
    matchAndReplaceUrl(e) {
        const config = proMap[this.settings.server]
        if (!config) {
            console.warn("配置不存在: %s", config)
            return false
        }
        for (var key in matches) {
            let item = matches[key]
            if (e && e.url && item(e.url)) {
                console.log("替换前的地址: %s", e.url)
                e.url = config[key](e.url)
                console.log("替换后的地址: %s", e.url)
                return true;
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
        this.hooks = new ApProxy();
        this.hooksList = [
            new ApCapacitor(),
            new ApElectron(),
            new ApFetch()
        ];
    }

    regedit() {
        this.hooksList.forEach(hook => hook.regedit(this.plugin));
        this.hooks.regedit(this.plugin);
    }

    unRegedit() {
        this.hooksList.forEach(hook => hook.unRegedit());
        this.hooks.unRegedit();
    }
}

