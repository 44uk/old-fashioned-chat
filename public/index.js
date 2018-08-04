function main() {
  var SYSTEM_SESSION = {
    name: "■管理人■",
    color: "yellow",
    isAdmin: true
  };
  var COLOR_DEFS = [
    {value: 'deepskyblue'  , text: 'あお'},
    {value: 'palevioletred', text: 'あか'},
    {value: 'limegreen'    , text: 'みどり'},
    {value: 'mediumpurple' , text: 'むらさき'},
    {value: 'hotpink'      , text: 'ピンク'},
    {value: 'darkorange'   , text: 'オレンジ'}
  ]
  var config = {
    apiKey: "AIzaSyDvPQCWEA0gK0B_TE-C0B5bKL2GFCb4EdM",
    authDomain: "old-fashioned-chat.firebaseapp.com",
    databaseURL: "https://old-fashioned-chat.firebaseio.com",
    projectId: "old-fashioned-chat",
    storageBucket: "old-fashioned-chat.appspot.com",
    messagingSenderId: "915821039605"
  };
  firebase.initializeApp(config);

  Vue.directive('focus', {
    inserted: function (el) {
      el.focus();
    }
  });

  Vue.component('color-selector', {
    props: {
      color: String
    },
    data: function () {
      return {
        colors: COLOR_DEFS
      };
    },
    created: function () {
      if(! this.color) {
        this.$emit('input', COLOR_DEFS[0].value);
      }
    },
    template: '<select @input="updateValue"><option v-for="c in colors" :key="c.value" :name="c.value">{{ c.text }}</option></select>',
    methods: {
      updateValue: function (ev) {
        var selected = ev.target.selectedOptions[0];
        if (selected) {
          var key = selected.getAttribute('name');
          this.$emit('input', key);
          this.$emit('selected', key);
        }
      }
    }
  });

  Vue.component('log', {
    props: {
      log: Object
    },
    template: '<div class="log" :data-key="log.key"><span :style="nameColor" :class="nameClass">{{ log.name }}</span><span class="log_body">{{ log.body }}</span><span class="log_date">({{ localDatetime }})</span></div>',
    computed: {
      localDatetime: function () {
        var date = new Date(this.log.date);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      },
      nameClass: function () {
        return {
          "log_name": true,
          "log_name-admin": this.log.isAdmin
        };
      },
      nameColor: function () {
        return { color: this.log.color };
      }
    }
  });

  var vm = new Vue({
    el: "#app",
    data: function () {
      return {
        name: null,
        color: null,
        session: null,
        body: null,
        logs: []
      }
    },
    created: function () {
      var self = this;
      var logsRef = firebase.database().ref('logs');
      logsRef.on('child_added', function (data) {
        var log = data.val();
        log.key = data.key;
        self.logs.unshift(log);
      });
      var sessionStr = Cookies.get('session');
      if(sessionStr) {
        var session = JSON.parse(sessionStr);
        this.login(session.name, session.color);
      }
    },
    methods: {
      login: function (name, color) {
        this.session = {name: name, color: color};
        Cookies.set('session', this.session, { expires: 90 });
      },
      logout: function () {
        this.name = null;
        this.color = null;
        this.body = null;
        this.session = null;
        Cookies.remove('session');
      },
      enter: function (ev) {
        ev.preventDefault();
        this.post(SYSTEM_SESSION, this.name + " さんが入室しました。")
          .then(function (_) { this.login(this.name, this.color); }.bind(this))
          .catch(function (err) { console.error(err) })
        ;
      },
      write: function (ev) {
        ev.preventDefault();
        this.post(this.session, this.body);
        this.body = null;
      },
      exit: function (ev) {
        ev.preventDefault();
        this.post(SYSTEM_SESSION, this.session.name + " さんが退室しました。")
          .then(this.logout.bind(this))
          .catch(function (err) { console.error(err) })
        ;
      },
      post: function (session, body) {
        var logsRef = firebase.database().ref('logs');
        return logsRef.push({
          name: session.name,
          color: session.color,
          body: body,
          date: (new Date()).toISOString(),
          isAdmin: !!session.isAdmin
        });
      }
    }
  });
}
window.addEventListener('DOMContentLoaded', main);
