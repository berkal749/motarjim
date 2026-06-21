import SwiftUI

struct GeneratedView: View {
    var body: some View {
    VStack {
        .navigationTitle("Title")
        VStack {
            VStack {
                Text("Premium Wireless Headphones Experience crystal-clear audio with noise cancellation technology.")
                Button("Shop Now") {
                    // action
                }
            }
        }
        VStack {
            VStack {
                Image("headphones.jpg")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .accessibilityLabel("Wireless Headphones")
                Text("Wireless Headphones $99.99 High-quality wireless audio with 30-hour battery life.")
                Button("Add to Cart") {
                    // action
                }
                Image("speaker.jpg")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .accessibilityLabel("Bluetooth Speaker")
                Text("Bluetooth Speaker $49.99 Portable speaker with rich bass and 360-degree sound.")
                Button("Add to Cart") {
                    // action
                }
                Image("earbuds.jpg")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .accessibilityLabel("Wireless Earbuds")
                Text("Wireless Earbuds $79.99 Compact earbuds with active noise cancellation.")
                Button("Add to Cart") {
                    // action
                }
            }
        }
        VStack {
            Text("© 2026 ShopStore. All rights reserved.")
        }
    }
    }
}
