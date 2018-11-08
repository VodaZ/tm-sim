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
  let counter = 1;
  
  return () => 'q' + counter++;
};

const getState = stateGenerator();



// tape 0 is implicit

const minus = (set, sym) => reject(equals(sym), set);

const createRule = (q_from, s_read, q_to, s_write) => `(${q_from}, ${s_read}) -> (${q_to}, (0, ${s_write}))`;
const createLRule = (q_from, s_read, q_to) => createRule(q_from, s_read, q_to, 'L');
const createRRule = (q_from, s_read, q_to) => createRule(q_from, s_read, q_to, 'R');

const createLTM = (Γ, q_from, q_to) => map(s => createLRule(q_from, s, q_to), Γ);
const createRTM = (Γ, q_from, q_to) => map(s => createRRule(q_from, s, q_to), Γ);
const createSymTM = (Γ, q_from, q_to, sym) => map(s => createRule(q_from, s, q_to, sym), Γ);
const createIdentityTM = (Γ, q_from, q_to) => map(s => createRule(q_from, s, q_to, s), Γ);

const createLSymTM = (Γ, sym, q_from, q_to) => {
  const middleQ = getState();
  
  return [
    ...createLTM(Γ, q_from, middleQ),
    ...createLTM(minus(Γ, sym), middleQ, middleQ),
    createRule(middleQ, sym, q_to, sym)
  ]
};

const createRSymTM = (Γ, sym, q_from, q_to) => {
  const middleQ = getState();
  
  return [
    ...createRTM(Γ, q_from, middleQ),
    ...createRTM(minus(Γ, sym), middleQ, middleQ),
    createRule(middleQ, sym, q_to, sym)
  ]
};

const createNotLSymTM = (Γ, sym, q_from, q_to) => {
  const middleQ = getState();
  
  return [
    ...createLTM(Γ, q_from, middleQ),
    createRule(middleQ, sym, middleQ, sym),
    ...createLTM(minus(Γ, sym), middleQ, q_to),
  ]
};

const createNotRSymTM = (Γ, sym, q_from, q_to) => {
  const middleQ = getState();
  
  return [
    ...createRTM(Γ, q_from, middleQ),
    createRule(middleQ, sym, middleQ, sym),
    ...createRTM(minus(Γ, sym), middleQ, q_to),
  ]
};
  
const isLTM = m => m.length === 1 && m[0] === 'L';
const isRTM = m => m.length === 1 && m[0] === 'R';
const isSymTM = m => m.length === 1 && m[0] !== 'R' && m[0] !== 'L';
const isLSymTM = m => m.length === 2 && m[0] === 'L';
const isRSymTM = m => m.length === 2 && m[0] === 'R';
const isNotLSymTM = m => m => m.length === 3 && m[0] === 'L' && m[1] === '~';
const isNotRSymTM = m => m => m.length === 3 && m[0] === 'R' && m[1] === '~';

const parseLTM = Γ => (q_from, m) => {
  const q_to = getState();
  const rules = createLTM(Γ, q_from, q_to);
  
  return { q_from, q_to, rules };
};

const parseRTM = Γ => (q_from, m) => {
  const q_to = getState();
  const rules = createRTM(Γ, q_from, q_to);
  
  return { q_from, q_to, rules };
};

const parseSymTM = Γ => (q_from, m) => {
  const q_to = getState();
  const rules = createSymTM(Γ, q_from, q_to, m[0]);
  
  return { q_from, q_to, rules };
};

const parseLSymTM = Γ => (q_from, m) => {
  const q_to = getState();
  const rules = createLSymTM(Γ, m[1], q_from, q_to);
  
  return { q_from, q_to, rules };
};

const parseRSymTM = Γ => (q_from, m) => {
  const q_to = getState();
  const rules = createRSymTM(Γ, m[1], q_from, q_to);
  
  return { q_from, q_to, rules };
};

const parseNotLSymTM = Γ => (q_from, m) => {
  const q_to = getState();
  const rules = createNotLSymTM(Γ, m[2], q_from, q_to);
  
  return { q_from, q_to, rules };
};

const parseNotRSymTM = Γ => (q_from, m) => {
  const q_to = getState();
  const rules = createNotRSymTM(Γ, m[2], q_from, q_to);
  
  return { q_from, q_to, rules };
};

const machineDetectors = {
  isLTM: parseLTM,
  isRTM: parseRTM,
  isSymTM: parseSymTM,
  isLSymTM: parseLSymTM,
  isRSymTM: parseRSymTM,
  isNotLSymTM: parseNotLSymTM,
  isNotRSymTM: parseNotRSymTM
};

const machineDetectorsPairs = toPairs(machineDetectors);

const compileMachine = (Γ, compilers) => (machine, q) => {
  const compiler = find(c => eval(c[0])(machine), compilers)[1];
    
  return compiler(Γ)(q, machine);
};

const compileMachines = (Γ, machines, compilers, q0) => {
  const compiler = compileMachine(Γ, compilers);
  
  const compiledMachine = reduce((meta, machineCode) => {
    const compiled = compiler(machineCode, meta.q_to);
        
    const compiledQ = compiled.q_to;
    const compiledRules = compiled.rules;
    
    return {
      q_from: meta.q_from,
      q_to: compiledQ,
      rules: [...meta.rules, ...compiledRules]
    };
  }, {q_from: q0, q_to: q0, rules: []}, machines);
  
  return compiledMachine;
};

const copyTM = (Γ, q0) => {
  const src_machinesA = ['RΔ', 'R', 'Δ', 'LΔ', 'LΔ'];
  const machinesA = compileMachines(Γ, src_machinesA, machineDetectorsPairs, q0);
  const q_to_machinesA = machinesA.q_to;
 
  const q_to_machineR = getState();
  const machineR = createRTM(Γ, q_to_machinesA, q_to_machineR);
  
  const copyRules = map(s => {
    const src_machines = ['Δ', 'RΔ', 'RΔ', s, 'R', 'Δ', 'LΔ', 'LΔ', s];
    const q_from_machines = getState();
    const machines = compileMachines(Γ, src_machines, machineDetectorsPairs, q_from_machines);
  
    const rule = `(${q_to_machineR}, ${s}) -> (${q_from_machines}, (0, ${s}))`;
    
    const machine = createIdentityTM(Γ, machines.q_to, q_to_machinesA);
    
    return [
      ...machines.rules,
      rule,
      ...machine
    ]
  }, minus(Γ, Del));
        
  const allRules = reduce(concat, [], [
    machinesA.rules,
    machineR,
    ...copyRules
  ]);
      
  return TM(Γ, allRules, q0, qf, {0: Del + 'abxcy' + Del});
};

const q0 = getState();
const qf = 'qf';
const Q = [q0, 'q1', qf];
const Σ = ['a', 'b', 'c', 'x', 'y', 'z'];
const Γ = [...Σ, Del];

console.log(stateStr(copyTM(Γ, q0)))


