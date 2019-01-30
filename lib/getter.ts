interface IGetter {
  get(key: string | Array<string>): IGetter;
  value: any;
}
// NoValue is a special getter that returns undefined for value
export const NoValue: IGetter = {
  get(key: string | Array<string>) {
    return this;
  },
  get value() {
    return undefined;
  }
};

// Getter is a class that safely wraps and retrieves
// properties in an object
class Getter implements IGetter {
  constructor(private _value: any) {}

  get(key: string | Array<string>, ...remaining: Array<string>): IGetter {
    if (!(key instanceof Array)) {
      if (!remaining.length) {
        key = key
          .split('.')
          .map(s => s.trim())
          .filter(s => s !== '');
      } else {
        key = [key];
      }
    }

    let curr = this._value;
    for (let i = 0; i < key.length; i++) {
      if (curr[key[i]] !== undefined) {
        curr = curr[key[i]];
        continue;
      }
      return NoValue;
    }
    return new Getter(curr);
  }

  get value() {
    return this._value;
  }
}

export { Getter };
