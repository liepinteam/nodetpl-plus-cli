let template = {};

template.es = (tpls, scripts) => `class CoreClass {
  constructor() {
    this.tpls = {};
    this.scripts = {};
    this.datas = {};
    this._initTpls()._initScripts();
    return this;
  }

  _generate() {
    return Math.random().toString().replace('.', '');
  }

  _initTpls() {
    this.tpls = {
      ${tpls.join(',')}
    };
    return this;
  }

  _initScripts() {
    this.scripts = {
      ${scripts.join(',')}
    };
    return this;
  }

  duid() {
    return '_tpl_d_' + this._generate();
  }

  guid() {
    return '_tpl_g_' + this._generate();
  }

  render(data, guid) {
    return this.tpls.main(data, guid || this.guid());
  }
}

export default {
  render: data => new CoreClass().render(data)
};`;

export default template;