function main() {
  var COLOR_DEFS = [
    {value: 'deepskyblue'  , text: 'あお'},
    {value: 'palevioletred', text: 'あか'},
    {value: 'limegreen'    , text: 'みどり'},
    {value: 'mediumpurple' , text: 'むらさき'},
    {value: 'hotpink'      , text: 'ピンク'},
    {value: 'darkorange'   , text: 'オレンジ'}
  ];

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

  Vue.component('input-form', {
    data: function () {
      return {
        body: null
      }
    },
    template: '#tmpl-input-form',
    methods: {
      submit: function (ev) {
        ev.preventDefault();
        this.$emit('on-submit', {body: this.body});
        this.body = null;
      }
    }
  });

  Vue.component('enter-form', {
    data: function () {
      return {
        name: null,
        color: null
      }
    },
    template: '#tmpl-enter-form',
    methods: {
      submit: function (ev) {
        ev.preventDefault();
        this.$emit('on-submit', {name: this.name, color: this.color});
      }
    }
  });

  Vue.component('color-selector', {
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
    template: '#tmpl-color-selector',
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

  Vue.component('logs', {
    props: {
      collection: Array
    },
    template: '#tmpl-logs'
  });

  Vue.component('log', {
    props: {
      log: Object
    },
    template: '#tmpl-log',
    computed: {
      localDatetime: function () {
        var date = new Date(this.log.date);
        return date.toLocaleDateString() +
          ' ' + date.toLocaleTimeString()
        ;
      },
      nameColor: function () {
        return { color: this.log.color };
      }
    },
    methods: {
      submit: function (ev) {
        this.$emit('submit', key);
      }
    }
  });

  var vm = new Vue({
    el: "#app",
    data: function () {
      return {
        session: null,
        logs: []
      }
    },
    created: function () {
      var logsRef = firebase.database().ref('logs');
      logsRef.orderByChild('date').limitToLast(100).on('child_added', function (data) {
        console.debug('called on child_added on /logs')
        var log = data.val();
        log.key = data.key;
        this.logs.unshift(log);
      }.bind(this));

      firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
          console.debug('logged in');
          this.login(user);
        } else {
          console.debug('not logged in');
        }
      }.bind(this));
    },
    methods: {
      enter: function (payload) {
        firebase.auth().signInAnonymously()
          .then(function (data) {
            console.debug('signInAnonymously')
            var user = data.user;
            var profRef = firebase.database().ref('profs/' + user.uid);
            var prof = {
              name: payload.name,
              color: payload.color
            }
            return profRef.set(prof).then(function () {
              return user;
            });
          }.bind(this))
          .then(function (data) {
            this.login(data);
          }.bind(this))
          .catch(function (err) {
            alert("ログインに失敗しました。もう一度お試しください。");
            console.error(err)
          })
        ;
      },
      login: function (user) {
        var profRef = firebase.database().ref('profs/' + user.uid);
        return profRef.on('value', function (snapshot) {
          var prof = snapshot.val();
          this.session = {
            uid: user.uid,
            name: prof.name,
            color: prof.color
          };
          return this.session;
        }.bind(this))
      },
      write: function (payload) {
        this.post(this.session, payload.body)
          .catch(function(err) {
            console.log(err);
          })
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
      },
      exit: function (ev) {
        ev.preventDefault();
        firebase.auth().currentUser.delete()
          .then(function (_) {
            return this.logout();
          }.bind(this))
          .catch(function(err) {
            console.log(err);
          })
        ;
      },
      logout: function () {
        var name = this.session.name;
        this.session = null;
        return Promise.resolve(name);
      }
    }
  });
}
window.addEventListener('DOMContentLoaded', main);
window.addEventListener('load', function() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register("/serviceWorker.js")
      .then(function(registration) {
        console.log("serviceWorker registered.");
      }).catch(function(error) {
        console.warn("serviceWorker error.", error);
      })
    ;
  }
});
