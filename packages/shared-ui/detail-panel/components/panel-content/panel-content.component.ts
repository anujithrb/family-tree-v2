import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { TreePerson, TreeCouple } from '../../../tree-viewer/models/tree-data.model';
import type { PanelView } from '../../models/panel.model';

@Component({
  selector: 'ft-panel-content',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './panel-content.component.html',
  styleUrl: './panel-content.component.scss',
})
export class PanelContentComponent {
  readonly person = input.required<TreePerson>();
  readonly mode = input.required<PanelView>();
  readonly isAdmin = input(false);
  readonly couples = input<TreeCouple[]>([]);
  readonly coupleChildren = input<Record<string, TreePerson[]>>({});

  readonly modeChange = output<PanelView>();
  readonly formSubmit = output<Record<string, unknown>>();
  readonly personNavigate = output<string>();
  readonly deleteRequested = output();

  // Edit form state
  readonly formName = signal('');
  readonly formGender = signal('');
  readonly formBirthYear = signal<number | null>(null);
  readonly formDeathYear = signal<number | null>(null);
  readonly formIsDeceased = signal(false);

  // For add-parents mode
  readonly parent1Name = signal('');
  readonly parent1Gender = signal('');
  readonly parent1BirthYear = signal<number | null>(null);
  readonly parent2Name = signal('');
  readonly parent2Gender = signal('');
  readonly parent2BirthYear = signal<number | null>(null);

  readonly personCouple = computed(() => {
    const p = this.person();
    return this.couples().find((c) => c.spouseAId === p.nodeId || c.spouseBId === p.nodeId);
  });

  readonly spouseId = computed(() => {
    const c = this.personCouple();
    const p = this.person();
    if (!c) return null;
    return c.spouseAId === p.nodeId ? c.spouseBId : c.spouseAId;
  });

  readonly children = computed(() => {
    const c = this.personCouple();
    if (!c) return [];
    return this.coupleChildren()[c.id] ?? [];
  });

  private initForm(): void {
    const p = this.person();
    this.formName.set(p.name);
    this.formGender.set(p.gender ?? '');
    this.formBirthYear.set(p.birthYear);
    this.formDeathYear.set(p.deathYear);
    this.formIsDeceased.set(p.isDeceased);
  }

  onEdit(): void {
    this.initForm();
    this.modeChange.emit('person-edit');
  }

  onModeChange(mode: PanelView): void {
    if (mode === 'person-edit') this.initForm();
    this.modeChange.emit(mode);
  }

  onSubmit(): void {
    const mode = this.mode();
    if (mode === 'person-edit') {
      this.formSubmit.emit({
        action: 'edit',
        nodeId: this.person().nodeId,
        name: this.formName(),
        gender: this.formGender() || undefined,
        birthYear: this.formBirthYear(),
        deathYear: this.formDeathYear(),
        isDeceased: this.formIsDeceased(),
      });
    } else if (mode === 'add-couple') {
      this.formSubmit.emit({
        action: 'add-child',
        coupleId: this.personCouple()?.id,
        name: this.formName(),
        gender: this.formGender() || undefined,
        birthYear: this.formBirthYear(),
      });
    } else if (mode === 'add-person') {
      this.formSubmit.emit({
        action: 'add-person',
        treeNodeId: this.person().nodeId,
        name: this.formName(),
        gender: this.formGender() || undefined,
        birthYear: this.formBirthYear(),
      });
    }
  }

  onNavigate(nodeId: string): void {
    this.personNavigate.emit(nodeId);
  }
}
