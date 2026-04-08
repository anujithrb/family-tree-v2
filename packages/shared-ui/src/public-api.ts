// @family-tree/shared-ui public API

export { ThemeService, type Theme } from '../services/theme.service';

// Tree viewer
export {
  TreeViewerComponent,
  TreeCanvasComponent,
  PersonCardComponent,
  TreeConnectorComponent,
  TreeLayoutService,
  TreeZoomService,
  type ZoomTransform,
  type LayoutConstants,
  DEFAULT_LAYOUT_CONSTANTS,
  type LayoutCouple,
  type CoupleLayout,
  type SoloNodeLayout,
  type TreeLayoutResult,
} from '../tree-viewer/index';

export type {
  TreePerson,
  TreeCouple,
  TreeResponse,
  Community,
  CommunityDetail,
  CommunityAdmin,
  UserProfile,
  RelationshipResult,
} from '../tree-viewer/index';

// Detail panel
export {
  SidePanelComponent,
  BottomSheetComponent,
  type BottomSheetState,
  PanelNavigationService,
  type PanelState,
  type PanelView,
  type PanelHistoryEntry,
  PanelContentComponent,
} from '../detail-panel/index';
