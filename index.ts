export enum UnitType {
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
}

abstract class Command<State> {
    abstract execute(state: State[]): State[];
    abstract undo(state: State[]): State[];
    abstract redo(state: State[]): State[];
}

class CommandStack<State> {
    private stack: Command<State>[] = [];
    private undoneStack: Command<State>[] = [];
    private _state: State[] = [];

    constructor(commands: Command<State>[]) {
        this.execute(commands);
    }

    get state(): State[] | undefined {
        return this._state;
    }

    execute(commands: Command<State>[]): void {
        commands.forEach(command => {
            this._state = command.execute(this._state);
            this.stack.push(command);
        });
    }

    undo(): void {
        const command = this.stack.pop();
        if (command) {
            const undoneState = command.undo(this._state);
            if (undoneState !== undefined) {
                this.undoneStack.push(command);
                this._state = undoneState;
            }
        }
    }

    redo(): void {
        const command = this.undoneStack.pop();
        if (command) {
            const redoneState = command.redo(this._state);
            if (redoneState !== undefined) {
                this.stack.push(command);
                this._state = redoneState;
            }
        }
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
        throw Error('Cannot undo load');
    }

    redo(state: FlatUnit[]): FlatUnit[] {
        throw Error('Cannot redo load');
    }
}

class Create extends Command<FlatUnit> {
    private originalValue?: FlatUnit[];

    constructor(private value: FlatUnit[]) {
        super();
    }

    execute(state: FlatUnit[]): FlatUnit[] {
        console.log('Execute Create');
        this.originalValue = state;
        return this.value;
    }

    undo(): FlatUnit[] {
        console.log('Undo Create');
        return this.originalValue!;
    }

    redo(): FlatUnit[] {
        console.log('Redo Create');
        return this.execute(this.originalValue!);
    }
}

const cs = new CommandStack<FlatUnit>(
    [
        new Load([
            new FlatUnit({ id: 'id01', chartId: 'chart01', clientId: 'client01', code: 'rt-01', name: 'Root', pid: '', tags: [UnitType['root']], type: UnitType['root'] }),
            new FlatUnit({ id: 'id02', chartId: 'chart01', clientId: 'client01', code: 'sr-01', name: 'Sub Root', pid: 'id01', tags: [UnitType['subRoot']], type: UnitType['subRoot'] })
        ]),
        new Create([
            new FlatUnit({ id: 'id03', chartId: 'chart01', clientId: 'client01', code: 'area-01', name: 'Area', pid: 'id02', tags: [UnitType['area']], type: UnitType['area'] }),
        ]),
        new Create([
            new FlatUnit({ id: 'id4', chartId: 'chart01', clientId: 'client01', code: 'area-02', name: 'Area', pid: 'id02', tags: [UnitType['area']], type: UnitType['area'] }),
        ]),
    ]
);

console.log('~~~~~~~~~~~~~~~~~CURRENT STATE~~~~~~~~~~~~~~~~~\n');
console.log(cs.state); // Output the current state
console.log('~~~~~~~~~~~~~~~~~CURRENT STATE~~~~~~~~~~~~~~~~~\n');

cs.undo();
console.log('\n~~~~~~~~~~~~~~~~~STATE AFTER UNDO~~~~~~~~~~~~~~~~~\n');
console.log(cs.state); // Output the state after undo
console.log('\n~~~~~~~~~~~~~~~~~STATE AFTER UNDO~~~~~~~~~~~~~~~~~\n');

cs.redo();
console.log('\n~~~~~~~~~~~~~~~~~STATE AFTER REDO~~~~~~~~~~~~~~~~~\n');
console.log(cs.state); // Output the state after redo
console.log('\n~~~~~~~~~~~~~~~~~STATE AFTER REDO~~~~~~~~~~~~~~~~~\n');