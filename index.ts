enum UnitType {
    area = 'area',
    branch = 'branch',
    brand = 'brand',
    businessUnit = 'businessUnit',
    client = 'client',
    department = 'department',
    departmentGroup = 'departmentGroup',
    district = 'district',
    division = 'division',
    group = 'group',
    homeDepartment = 'homeDepartment',
    lineOfBusiness = 'lineOfBusiness',
    market = 'market',
    practice = 'practice',
    program = 'program',
    region = 'region',
    root = 'root',
    sector = 'sector',
    segment = 'segment',
    subDept = 'subDept',
    subGroup = 'subGroup',
    subRoot = 'subRoot',
    tier = 'tier',
    workUnit = 'workUnit',
    zone = 'zone',
}

class FlatUnit {
    id: string;
    clientId: string;
    chartId: string;
    parentUTURelationshipID?: string;
    pid: string;
    name: string;
    code: string;
    type: UnitType;
    tags: UnitType[];

    constructor({ id, clientId, chartId, parentUTURelationshipID, pid, name, code, type, tags }: {
        id: string;
        clientId: string;
        chartId: string;
        parentUTURelationshipID?: string;
        pid: string;
        name: string;
        code: string;
        type: UnitType;
        tags: UnitType[];
    }) {
        this.id = id;
        this.clientId = clientId;
        this.chartId = chartId;
        this.parentUTURelationshipID = parentUTURelationshipID;
        this.pid = pid;
        this.name = name;
        this.code = code;
        this.type = type;
        this.tags = tags;
    }

    toString(): string {
        return JSON.stringify(this, null, 3);
    }
}

abstract class Command<State> {
    abstract execute(state: State[]): State[];
    abstract undo(state: State[]): State[];
    abstract redo(state: State[]): State[];
}

interface Stringifiable {
    toString(): string;
}

class CommandStack<State extends Stringifiable> {
    private stack: Command<State>[] = [];
    private undoneStack: Command<State>[] = [];
    private _state: State[] = [];
    private _prevState: State[] = []; // New variable to store previous state

    constructor(commands: Command<State>[]) {
        this.execute(commands);
    }

    get state(): State[] {
        return this._state;
    }

    execute(commands: Command<State>[]): void {
        commands.forEach(command => {
            console.log(`Executing command: ${command.constructor.name}`);
            console.log('State before execution:', this._state);
            this._prevState = this._state;; // Store the previous state
            this._state = command.execute(this._state);
            console.log('State after execution:', this._state);
            this.stack.push(command);
        });
    }

    undo(): void {
        const command = this.stack.pop();
        if (command) {
            console.log(`Undoing command: ${command.constructor.name}`);
            console.log('State before undo:', this._state);
            this._state = this._prevState; // Restore the previous state
            command.undo(this._state);     
            console.log('State after undo:', this._state);
            this.undoneStack.push(command);
        }
    }

    redo(): void {
        const command = this.undoneStack.pop();
        console.log('POPPED ON REDO')
        if (command) {
            console.log(`Redoing command: ${command.constructor.name}`);
            console.log('State before redo:', this._state);
            this._state = command.redo(this._state);
            console.log('State after redo:', this._state);
            this.stack.push(command);
        }
    }

    toString(): string {
        let result = '';
        this.stack.forEach((command, index) => {
            result += `Command ${index + 1} (${command.constructor.name}):\n`;
            result += command.toString() + '\n';
        });
        return result;
    }
}


class Load extends Command<FlatUnit> {
    constructor(private value: FlatUnit[]) {
        super();
    }

    execute(state: FlatUnit[]): FlatUnit[] {
        console.log('Execute Load');
        return this.value;
    }

    undo(state: FlatUnit[]): FlatUnit[] {
        throw new Error('Cannot undo Load');
    }

    redo(state: FlatUnit[]): FlatUnit[] {
        throw new Error('Cannot redo Load');
    }

    toString(): string {
        return JSON.stringify(this.value, ['id', 'code', 'name', 'type'], 3);
    }
}

class Create extends Command<FlatUnit> {
    private originalValue: FlatUnit[] = [];

    constructor(private value: FlatUnit[]) {
        super();
    }

    execute(state: FlatUnit[]): FlatUnit[] {
        console.log('Execute Create');
        this.originalValue = state.slice();
        return state.concat(this.value);
    }

    undo(): FlatUnit[] {
        console.log('Undo Create');
        return this.originalValue;
    }

    redo(): FlatUnit[] {
        console.log('Redo Create');
        return this.execute(this.originalValue);
    }

    toString(): string {
        return JSON.stringify(this.value, ['id', 'code', 'name', 'type'], 3);
    }
}

class Update extends Command<FlatUnit> {
    private originalState: FlatUnit[] = [];

    constructor(private updates: FlatUnit[]) {
        super();
    }

    execute(state: FlatUnit[]): FlatUnit[] {
        console.log('Execute Update');
        // Save a deep copy of the original state
        this.originalState = JSON.parse(JSON.stringify(state));
        this.updates.forEach(update => {
            const index = state.findIndex(unit => unit.id === update.id);
            if (index !== -1) {
                state[index] = update;
            } else {
                throw new Error(`Cannot update unit that does not exist.`);
            }
        });
        return state;
    }

    undo(): FlatUnit[] {
        console.log('Undo Update');
        const newState = this.originalState.map(originalUnit => {
            const updatedUnit = this.updates.find(update => update.id === originalUnit.id);
            return updatedUnit ? updatedUnit : originalUnit;
        });
        return newState;
    }
    redo(): FlatUnit[] {
        console.log('Redo Update');
        return this.execute(JSON.parse(JSON.stringify(this.originalState)));
    }

    toString(): string {
        return JSON.stringify(this.updates, ['id', 'code', 'name', 'type'], 3);
    }
}

class Delete extends Command<FlatUnit> {
    private deletedUnits: FlatUnit[] = [];

    constructor(private value: FlatUnit[]) {
        super();
    }

    execute(state: FlatUnit[]): FlatUnit[] {
        console.log('Execute Delete');
        const unitsNotFound = this.value.filter(unit => !state.some(existingUnit => existingUnit.id === unit.id));
        if (unitsNotFound.length > 0) {
            throw new Error(`Cannot delete unit that does not exist.`);
        }
        this.deletedUnits = state.filter(unit => this.value.some(unitToDelete => unitToDelete.id === unit.id));
        return state.filter(unit => !this.deletedUnits.some(deletedUnit => deletedUnit.id === unit.id));
    }

    undo(state: FlatUnit[]): FlatUnit[] {
        console.log('Undo Delete');
        return state.concat(this.deletedUnits);
    }

    redo(state: FlatUnit[]): FlatUnit[] {
        console.log('Redo Delete');
        return this.execute(state);
    }

    toString(): string {
        return JSON.stringify(this.value, ['id', 'code', 'name', 'type'], 3);
    }
}


const cs = new CommandStack<FlatUnit>([]);

cs.execute([
    new Load([
        new FlatUnit({ id: 'id01', chartId: 'chart01', clientId: 'client01', code: 'rt-01', name: 'Root', pid: '', tags: [UnitType['root']], type: UnitType['root'] }),
        new FlatUnit({ id: 'id02', chartId: 'chart01', clientId: 'client01', code: 'sr-01', name: 'Sub Root', pid: 'id01', tags: [UnitType['subRoot']], type: UnitType['subRoot'] })
    ])
]);

// cs.undo()

cs.execute([
    new Create([
        new FlatUnit({ id: 'id03', chartId: 'chart01', clientId: 'client01', code: 'area-01', name: 'Area 1', pid: 'id02', tags: [UnitType['area']], type: UnitType['area'] })
    ])
]);

cs.execute([
    new Create([
        new FlatUnit({ id: 'id04', chartId: 'chart01', clientId: 'client01', code: 'area-03', name: 'Area 3', pid: 'id02', tags: [UnitType['area']], type: UnitType['area'] })
    ])
]);

cs.execute([
    new Update([
        new FlatUnit({ id: 'id03', chartId: 'chart01', clientId: 'client01', code: 'area-01', name: 'Area 00', pid: 'id02', tags: [UnitType['area']], type: UnitType['area'] }),
        new FlatUnit({ id: 'id04', chartId: 'chart01', clientId: 'client01', code: 'area-02', name: 'Area 2', pid: 'id02', tags: [UnitType['area']], type: UnitType['area'] }),
    ]),
]);

// cs.undo();
// cs.redo();

cs.execute([
    new Delete([
        new FlatUnit({ id: 'id04', chartId: 'chart01', clientId: 'client01', code: 'area-03', name: 'Area 3', pid: 'id02', tags: [UnitType['area']], type: UnitType['area'] })
    ])
]);

// cs.undo();

console.log(cs.toString());

console.log('Final State:\n', cs.state)