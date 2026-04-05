export class LinkResponseDto {
  id: string;
  treeNodeA: { id: string; personName: string; communityName: string };
  treeNodeB: { id: string; personName: string; communityName: string };
  status: string;
  createdAt: Date;
  actions: { action: string; actorType: string; createdAt: Date }[];
}
