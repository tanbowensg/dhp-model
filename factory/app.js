class App {
  constructor(app) {
    this._init(app);
  }

  _init(app) {
    this.name = app.Name;
  }
}

exports.App = App;
