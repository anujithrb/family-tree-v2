import { WizardStateService } from './wizard-state.service';

describe('WizardStateService', () => {
  let service: WizardStateService;

  beforeEach(() => {
    service = new WizardStateService();
  });

  it('should start on name step', () => {
    expect(service.step()).toBe('name');
    expect(service.people()).toHaveLength(0);
  });

  it('should set community name', () => {
    service.setCommunityName('Smith Family');
    expect(service.communityName()).toBe('Smith Family');
  });

  it('should add a person', () => {
    service.addPerson({ name: 'Alice', gender: 'FEMALE', birthYear: 1980, isDeceased: false });
    expect(service.people()).toHaveLength(1);
    expect(service.people()[0].name).toBe('Alice');
  });

  it('should add a couple', () => {
    const a = service.addPerson({
      name: 'Alice',
      gender: 'FEMALE',
      birthYear: null,
      isDeceased: false,
    });
    const b = service.addPerson({
      name: 'Bob',
      gender: 'MALE',
      birthYear: null,
      isDeceased: false,
    });
    service.addCouple(a.tempId, b.tempId);
    expect(service.couples()).toHaveLength(1);
  });

  it('should delete person and cascade cleanup', () => {
    const a = service.addPerson({
      name: 'Alice',
      gender: null,
      birthYear: null,
      isDeceased: false,
    });
    const b = service.addPerson({ name: 'Bob', gender: null, birthYear: null, isDeceased: false });
    service.addCouple(a.tempId, b.tempId);
    service.deletePerson(a.tempId);
    expect(service.people()).toHaveLength(1);
    expect(service.couples()).toHaveLength(0);
  });

  it('should reset state', () => {
    service.setCommunityName('Test');
    service.addPerson({ name: 'Alice', gender: null, birthYear: null, isDeceased: false });
    service.reset();
    expect(service.communityName()).toBe('');
    expect(service.people()).toHaveLength(0);
  });
});
