import WidgetKit
import SwiftUI

@main
struct PerezozoWidgetBundle: WidgetBundle {
    var body: some Widget {
        NextPaymentWidget()
        MonthlySpendWidget()
        UpcomingListWidget()
    }
}
