import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier

@Composable
fun GeneratedView() {
    Box(modifier = Modifier) {
        TopAppBar(
            title = { Text("Title") }
        )
        Column {
            Column {
                Text(text = "Premium Wireless Headphones Experience crystal-clear audio with noise cancellation technology.")
                Button(
                    onClick = { }
                ) {
                    Text(text = "Shop Now")
                }
                    
                    .semantics {
                        contentDescription = "Shop Now"
                    }
            }
        }
        Column {
            Column {
                Image(
                    painter = painterResource(id = R.drawable.headphones.jpg),
                    contentDescription = "Wireless Headphones"
                )
                Text(text = "Wireless Headphones $99.99 High-quality wireless audio with 30-hour battery life.")
                Button(
                    onClick = { }
                ) {
                    Text(text = "Add to Cart")
                }
                    
                    .semantics {
                        contentDescription = "Add to Cart"
                    }
                Image(
                    painter = painterResource(id = R.drawable.speaker.jpg),
                    contentDescription = "Bluetooth Speaker"
                )
                Text(text = "Bluetooth Speaker $49.99 Portable speaker with rich bass and 360-degree sound.")
                Button(
                    onClick = { }
                ) {
                    Text(text = "Add to Cart")
                }
                    
                    .semantics {
                        contentDescription = "Add to Cart"
                    }
                Image(
                    painter = painterResource(id = R.drawable.earbuds.jpg),
                    contentDescription = "Wireless Earbuds"
                )
                Text(text = "Wireless Earbuds $79.99 Compact earbuds with active noise cancellation.")
                Button(
                    onClick = { }
                ) {
                    Text(text = "Add to Cart")
                }
                    
                    .semantics {
                        contentDescription = "Add to Cart"
                    }
            }
        }
        Column {
            Text(text = "© 2026 ShopStore. All rights reserved.")
        }
    }
}
