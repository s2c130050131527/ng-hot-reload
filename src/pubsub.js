
var uniqId = 0;

class PubSub {

  constructor() {
    this.topics = new Map();
  }

  subscribe(topic, fun) {
    const token = ++uniqId;
    const config = { token, fun };

    if (!this.topics.has(topic)) {
      this.topics.set(topic, [config]);
    }
    else {
      this.topics.get(topic).push(config);
    }

    return token;
  }

  unsubscribe(token) {
    for (let topic of this.topic.values()) {
      const i = topic.indexOf(token);
      if (i !== -1) {
        topic.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  publish(topic, ...args) {
    if (!this.topics.has(topic)) return false;
    setTimeout(() => {
      for (let topic of this.topics.values()) {
        for (let {fun} of topic) fun.apply(undefined, args);
      }
    }, 0);
  }

}


export {PubSub};