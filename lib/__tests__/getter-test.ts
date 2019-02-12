import { Getter, NoValue } from '../getter';

const testObject = {
  str: 'abc',
  num: 1,
  nil: null,
  bool: true,
  arr: [],
  obj: {},
  nested: {
    deeply: {
      str: 'string'
    }
  }
};

describe('Getter', () => {
  const g = new Getter(testObject);
  it('can retrieve all of the values from the test object', () => {
    ['str', 'num', 'nil', 'bool', 'arr', 'obj', 'nested'].forEach(key => {
      expect(g.get(key).value).toBeDefined();
    });
  });

  it('can retrieve values nested via chained gets', () => {
    expect(
      g
        .get('nested')
        .get('deeply')
        .get('str').value
    ).toBe('string');
  });

  it('can retrieve values nested via array', () => {
    expect(g.get(['nested', 'deeply', 'str']).value).toBe('string');
  });

  it('can retrieve values nested via dotted separator', () => {
    expect(g.get('nested.deeply.str').value).toBe('string');
  });

  it('returns undefined for undefined nested objects', () => {
    expect(
      g
        .get('this')
        .get('does')
        .get('not')
        .get('exist').value
    ).toBeUndefined();
    expect(g.get(['this', 'does', 'not', 'exist']).value).toBeUndefined();
  });

  it('returns undefined if the intial value is undefined', () => {
    const g = new Getter(undefined);
    expect(g.get('foo').get('bar').value).toBeUndefined();
  });

  it('returns undefined for an undefined key', () => {
    expect(g.get('doesnotexist').value).toBeUndefined();
  });
});
