import { WizardStateService } from './wizard-state.service';

describe('WizardStateService', () => {
  let service: WizardStateService;

  beforeEach(() => {
    service = new WizardStateService();
  });

  it('should start on step 1 with no nodes', () => {
    expect(service.currentStep()).toBe(1);
    expect(service.nodes()).toHaveLength(0);
    expect(service.communityName()).toBe('');
  });

  it('should set community name', () => {
    service.setCommunityName('Smith Family');
    expect(service.communityName()).toBe('Smith Family');
  });

  it('should advance and go back steps', () => {
    service.nextStep();
    expect(service.currentStep()).toBe(2);
    service.nextStep();
    expect(service.currentStep()).toBe(3);
    service.prevStep();
    expect(service.currentStep()).toBe(2);
  });

  it('should not go below step 1 or above step 3', () => {
    service.prevStep();
    expect(service.currentStep()).toBe(1);
    service.nextStep();
    service.nextStep();
    service.nextStep();
    expect(service.currentStep()).toBe(3);
  });

  it('should add a node', () => {
    service.addNode({ tempId: 't1', name: 'Alice', gender: 'F', isSelf: true });
    expect(service.nodes()).toHaveLength(1);
    expect(service.nodes()[0].name).toBe('Alice');
  });

  it('should add a couple', () => {
    service.addNode({ tempId: 't1', name: 'Alice', gender: 'F' });
    service.addNode({ tempId: 't2', name: 'Bob', gender: 'M' });
    service.addCouple('t1', 't2');
    expect(service.couples()).toHaveLength(1);
    expect(service.couples()[0].spouseAId).toBe('t1');
  });

  it('should remove node and cascade cleanup', () => {
    service.addNode({ tempId: 't1', name: 'Alice', gender: 'F' });
    service.addNode({ tempId: 't2', name: 'Bob', gender: 'M' });
    service.addCouple('t1', 't2');
    service.removeNode('t1');
    expect(service.nodes()).toHaveLength(1);
    expect(service.couples()).toHaveLength(0);
  });

  it('should build submission', () => {
    service.setCommunityName('Test');
    service.addNode({ tempId: 't1', name: 'Alice', gender: 'F' });
    const submission = service.buildSubmission();
    expect(submission.communityName).toBe('Test');
    expect(submission.nodes).toHaveLength(1);
  });

  it('should init with config', () => {
    service.initWithConfig({ selfNode: { name: 'Me', gender: 'M' }, showAdminAssignment: false });
    expect(service.nodes()).toHaveLength(1);
    expect(service.nodes()[0].isSelf).toBe(true);
    expect(service.nodes()[0].name).toBe('Me');
  });

  it('should reset state', () => {
    service.setCommunityName('Test');
    service.addNode({ tempId: 't1', name: 'Alice', gender: 'F' });
    service.reset();
    expect(service.communityName()).toBe('');
    expect(service.nodes()).toHaveLength(0);
  });
});
