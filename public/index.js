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
    template: '<div class="log" :data-key="log.key"><span :style="nameColor" class="log_name">{{ log.name }}</span><span class="log_body">{{ log.body }}</span><span class="log_date">({{ localDatetime }})</span></div>',
    computed: {
      localDatetime: function () {
        var date = new Date(this.log.date);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
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

  //Vue.component('chat-login', {
  //  props: {
  //    name: String,
  //    color: String
  //  },
  //  template: '
  //      <form @submit="enter" style="display:inline-block">
  //        <input type="text" v-model="name" v-focus />
  //        <color-selector v-model="color"></color-selector>
  //        <button>入室</button>
  //      </form>
  //  ',
  //  methods: {
  //  }
  //})

  //Vue.component('chat-input', {
  //  template: '',
  //})

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
      var logsRef = firebase.database().ref('logs');
      logsRef.orderByChild('date').limitToLast(100).on('child_added', function (data) {
        console.debug('called on child_added on /logs')
        var log = data.val();
        log.key = data.key;
        this.logs.unshift(log);
      }.bind(this));

      firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
          console.debug('logged in')
          this.login(user);
        } else {
          console.debug('not logged in')
        }
      }.bind(this));
    },
    methods: {
      enter: function (ev) {
        ev.preventDefault();
        firebase.auth().signInAnonymously()
          .then(function (data) {
            console.debug('signInAnonymously')
            var user = data.user;
            var profRef = firebase.database().ref('profs/' + user.uid);
            var prof = {
              name: this.name,
              color: this.color
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
      write: function (ev) {
        ev.preventDefault();
        this.post(this.session, this.body)
          .then(function(_) {
            this.body = null;
          }.bind(this))
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
        this.name = null;
        this.color = null;
        this.body = null;
        this.session = null;
        return Promise.resolve(name);
      }
    }
  });
}
window.addEventListener('DOMContentLoaded', main);
