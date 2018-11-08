// M = (Q, Σ, Γ, δ, q0, qf);
console.clear();

const myUntil = (cond, f, data) => {
  let state = data;
   
  while(cond(state)) {
    state = f(state);
  };
    
  return state;
};

const Sig = 'Σ';
const Gam = 'Γ';
const del = 'δ';
const Del = 'Δ';

const parseTupple = pipe(
  replace(/[()]/g, ''),
  split(','),
  map(trim)
);

const toObj = pipe(
  toPairs,
  fromPairs
);

const tailToObj = pipe(
  tail,
  toObj
);

const parseLeftRulePart = pipe(
  parseTupple,
  applySpec({
    q_from: head,
    tapes_read: tailToObj
  })
);

const parseRightRulePart = s => {
  const parts = match(/\([^(]+|\(([^,]+)/g, s);
  const q_to = pipe(
    head,
    parseToState
  )(parts);
  
  const tapes_write = pipe(
    tail,
    map(parseTupple),
    fromPairs
  )(parts);
  
  return {tapes_write, q_to}
};

const parseToState = pipe(
  trim,
  match(/[^, (]+/),
  head
);

const parseRules = map(pipe(
  split('->'),
  map(trim),
  over(lensIndex(0), parseLeftRulePart),
  over(lensIndex(1), parseRightRulePart),
  mergeAll,
));

const getTapesConfig = map(({pos, cont}) => pipe(
  nth(pos),
  defaultTo(Del)
)(cont));

const findRuleCriterium = (tapeConfig, q) => allPass([
  propEq('tapes_read', tapeConfig),
  propEq('q_from', q),
]);

const findRule = (δ, tapeConfig, q) => find(findRuleCriterium(tapeConfig, q), δ);

const increments = {
  L: -1,
  R: +1
};

const getIncrement = pipe(
  prop(__, increments),
  defaultTo(0)
);

const noteq = complement(equals);

const condChangeTapeSymbol = (symbol, pos) => when(
  () => allPass([
    noteq('L'),
    noteq('R')
  ])(symbol),
  update(pos, symbol)
);

const nthIsNil = i => pipe(
  nth(i),
  isNil
);

const myUpdate = (pos, s) => pipe(
  assoc(pos, s),
  values
);

const addSymbolIfDoesntExist = pos => when(nthIsNil(pos), myUpdate(pos, Del));

const makeTapeStep = rule => (tape, tapeIndex) => {
  const actionForTape = pipe(
    prop('tapes_write'),
    prop(tapeIndex)
  )(rule);
    
  const newPos = pipe(
    prop('pos'),
    add(getIncrement(actionForTape))
  )(tape);
  
  const newCont = pipe(
    prop('cont'),
    condChangeTapeSymbol(actionForTape, newPos),
    addSymbolIfDoesntExist(newPos)
  )(tape);
    
  return {
    pos: newPos,
    cont: newCont
  };
};

const makeStep = (state, rule) => {
  const tapes = mapObjIndexed(makeTapeStep(rule), state.tapes);
  const q = rule.q_to;
  
  return {q, tapes};
};

const TM = (Γ, δ, q0, qf, tapes) => {
  const parsedδ = parseRules(δ);
  const tapesNO = pipe(
    head,
    prop('tapes_write'),
    keys,
    prop('length')
  )(parsedδ);
  
  const extendedTapes = pipe(
    defaultTo(pipe(
      range(0),
      map(always(Del)),
      toObj
    )(tapesNO)),
    map(s => ({pos: 0, cont: s}))
  )(tapes);
  
  const state = {
    q: q0,
    tapes: extendedTapes
  };
        
  let maxSteps = 1000;
  const cond = state => !state.finish && maxSteps > 0;
  const f = state => {
    console.log(stateStr(state));
    
    maxSteps--;
        
    const tapeConfig = getTapesConfig(state.tapes);
    const applicableRule = findRule(parsedδ, tapeConfig, state.q);
        
    if(!applicableRule) {
      return {
        finish: true,
        q: state.q,
        tapes: state.tapes
      };
    }
    
    return makeStep(state, applicableRule);
  };
  
  return myUntil(cond, f, state);
};

const markActiveSymbol = ({pos, cont}) => over(lensIndex(pos), s => `[${s}]`, cont);

const tapeStr = (tape, index) => pipe(
  markActiveSymbol,
  prepend('('),
  prepend('\n  ' + index + ': '),
  append(')'),
  join('')
)(tape);

const stateStr = state => {
  const tapesStr = pipe(
    prop('tapes'),
    mapObjIndexed(tapeStr),
    values
  )(state);
  
  return state.q + ': ' + join(', ', tapesStr) + '\n-----------------';
};

const stateGenerator = () => {
  let counter = 0;
  
  return () => 'q' + counter++;
};

const getState = stateGenerator();

const q0 = getState();
const q1 = getState();
const qf = 'qf';
const Q = [q0, q1, qf];
const Σ = ['a', 'b', 'c', 'x', 'y', 'z'];
const Γ = [...Σ, Del];

const δ = [
  `(${q0}, Δ, Δ) -> (q1, (0, R), (1, R))`,
  `(${q1}, a, a) -> (q1, (0, R), (1, L))`
];

const tm = TM(Γ, δ, q0, qf, {0: 'ΔaΔ', 1: 'Δaaa'});

console.log(stateStr(tm))


